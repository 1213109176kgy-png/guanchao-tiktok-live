import { TikTokLiveConnection, WebcastEvent, ControlEvent, SignConfig, type WebcastGotHttpConfig } from 'tiktok-live-connector';
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import { Store } from './store.ts';
import { normalizeEvent } from './normalize.ts';
import type { EventKind, Task } from '../shared/types.ts';

interface Slot { active:boolean; timer?:ReturnType<typeof setTimeout>; client?:TikTokLiveConnection; retries:number; }
export function safeError(error: unknown): string {
  const err=error as {name?:string;message?:string};
  let text=err?.message ?? String(error);
  if(process.env.EULER_API_KEY)text=text.split(process.env.EULER_API_KEY).join('[已隐藏]');
  text=text.replace(/(https?:\/\/)[^/@\s]+:[^/@\s]+@/gi,'$1[已隐藏]@');
  text=text.replace(/(sessionid|tt-target-idc|api[_-]?key|token|signature|authorization)([=:\s]+)([^\s&,;]+)/gi,'$1$2[已隐藏]')
    .replace(/Bearer\s+[^\s]+/gi,'Bearer [已隐藏]');
  if (/offline|not live/i.test(text)) return '主播当前未开播，请确认账号并在开播后重试。';
  if (/rate.?limit|429/i.test(text)) return '签名服务或 TikTok 请求达到限额，请稍后重试，或在运行设置中检查签名服务密钥。';
  if (/timeout|ETIMEDOUT|ENOTFOUND|ECONN|fetch failed/i.test(text)) return '连接超时或网络不可达。请检查 TikTok 及签名服务的网络连通性，可在运行设置中检查网络代理。';
  return text.slice(0,600);
}
export class Collector {
  slots=new Map<string,Slot>();
  constructor(private store:Store, private notify:()=>void,
    private clientFactory:(host:string,options:ConstructorParameters<typeof TikTokLiveConnection>[1])=>TikTokLiveConnection=(host,options)=>new TikTokLiveConnection(host,options)) {}
  start(task:Task) {
    if(task.mode!=='live')throw new Error('仅支持真实直播间采集');
    if(this.slots.has(task.id)) throw new Error('这个直播间已经在运行');
    if(this.slots.size>=3) throw new Error('本地版最多同时运行 3 个直播间，请先停止一个任务');
    const slot:Slot={active:true,retries:0};this.slots.set(task.id,slot);
    this.store.updateTask(task.id,{status:'connecting',error:null,viewerCount:null,startedAt:new Date().toISOString()});this.notify();
    void this.connect(task,slot);
  }
  private ingest(task:Task,slot:Slot,kind:EventKind,data:unknown) {
    if(!slot.active || this.slots.get(task.id)!==slot) return;
    try { if(this.store.ingest(task.id,normalizeEvent(kind,data))) this.notify(); }
    catch(error) { this.store.updateTask(task.id,{error:'事件保存失败：'+safeError(error)});this.notify(); }
  }
  private async connect(task:Task,slot:Slot) {
    let timeout:ReturnType<typeof setTimeout>|undefined;
    let client:TikTokLiveConnection|undefined;
    try {
      const proxy=process.env.HTTPS_PROXY;
      const agent=proxy?{http:new HttpProxyAgent({proxy}),https:new HttpsProxyAgent({proxy})}:undefined;
      // The sign SDK uses Axios, independent of the connector's got client.
      // Configure both transports before the first cached sign client is created.
      SignConfig.baseOptions={...SignConfig.baseOptions,timeout:10000,...(agent?{httpAgent:agent.http,httpsAgent:agent.https,proxy:false}:{})};
      client=this.clientFactory(task.host,{
        signApiKey:process.env.EULER_API_KEY || undefined,processInitialData:false,
        fetchRoomInfoOnConnect:true,enableExtendedGiftInfo:false,authenticateWs:false,
        // 2.5.0's type incorrectly requires cookieJar here; its runtime always
        // creates and injects its own jar (WebcastHttpClient constructor).
        webClientOptions:{timeout:{request:10000},retry:{limit:0},...(agent?{agent}:{})} as WebcastGotHttpConfig,
        wsClientOptions:{handshakeTimeout:12000,...(agent?{agent:agent.https}:{})},
      });
      slot.client=client;
      client.on(ControlEvent.ERROR,(e)=>{
        if(slot.active) {this.store.updateTask(task.id,{error:safeError(e)});this.notify();}
      });
      const handlers:[WebcastEvent,EventKind][]=[
        [WebcastEvent.CHAT,'chat'],[WebcastEvent.MEMBER,'member'],[WebcastEvent.GIFT,'gift'],
        [WebcastEvent.LIKE,'like'],[WebcastEvent.FOLLOW,'follow'],[WebcastEvent.SHARE,'share'],[WebcastEvent.BARRAGE,'badge'],
      ];
      for(const [event,kind] of handlers) client.on(event as WebcastEvent.CHAT,(data)=>this.ingest(task,slot,kind,data));
      client.on(WebcastEvent.ROOM_USER,(data)=>{
        if(!slot.active) return;
        const d=data as unknown as Record<string,unknown>, n=Number(d.total ?? d.totalUser ?? d.viewerCount);
        if(Number.isSafeInteger(n)&&n>=0) {this.store.updateTask(task.id,{viewerCount:n});this.notify();}
      });
      client.on(WebcastEvent.STREAM_END,()=>{void this.stop(task.id);});
      client.on(ControlEvent.DISCONNECTED,()=>{
        if(slot.active && this.store.task(task.id)?.status==='live') this.reconnect(task,slot);
      });
      const pending=client.connect();
      // disconnect() cannot cancel every room-resolution request. Guard late arrivals
      // with slot.active and close the socket if a stopped request eventually resolves.
      void pending.then(()=>{if(!slot.active) void client?.disconnect().catch(()=>{});},()=>{});
      const state=await Promise.race([pending,new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Connection timeout')),35000);})]);
      if(!slot.active) return;
      this.store.updateTask(task.id,{status:'live',roomId:String(state.roomId),error:null});this.notify();
    } catch(error) {
      if(!slot.active) return;
      slot.active=false;this.slots.delete(task.id);
      void client?.disconnect().catch(()=>{});
      this.store.updateTask(task.id,{status:'error',viewerCount:null,error:safeError(error)});this.notify();
    } finally {if(timeout)clearTimeout(timeout);}
  }
  private reconnect(task:Task,slot:Slot) {
    slot.retries++;
    if(slot.retries>3) {
      slot.active=false;this.slots.delete(task.id);
      this.store.updateTask(task.id,{status:'error',viewerCount:null,error:'连接中断，自动重连 3 次后仍未恢复。请确认主播是否仍在直播，再手动重试。'});this.notify();return;
    }
    this.store.updateTask(task.id,{status:'reconnecting',viewerCount:null,error:`连接中断，等待第 ${slot.retries} 次重连…`});this.notify();
    slot.client?.removeAllListeners();slot.client?.on(ControlEvent.ERROR,()=>{});
    slot.timer=setTimeout(()=>{if(slot.active) void this.connect(task,slot);},[5000,15000,30000][slot.retries-1]);
  }
  async stop(id:string) {
    const slot=this.slots.get(id);
    if(slot) {
      slot.active=false;if(slot.timer)clearTimeout(slot.timer);this.slots.delete(id);
      // Don't block the user's stop request on a remote WebSocket close handshake.
      void slot.client?.disconnect().catch(()=>{});
    }
    this.store.updateTask(id,{status:'stopped',viewerCount:null});this.notify();
  }
  async close() {for(const id of [...this.slots.keys()]) await this.stop(id);}
}
