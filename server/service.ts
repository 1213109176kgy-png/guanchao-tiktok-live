import { EventEmitter } from 'node:events';
import type { AudienceQuery, FollowStatus, Mode } from '../shared/types.ts';
import { Store } from './store.ts';
import { Collector, safeError } from './collector.ts';
import { parseHost } from './normalize.ts';

const statuses:FollowStatus[]=['new','pending','contacted','interested','closed'];
function mode(value:unknown):Mode {if(value!=='live')throw new Error('仅支持真实采集数据');return value;}
function text(value:unknown,max=200):string|undefined {if(value===undefined||value==='')return undefined;if(typeof value!=='string'||value.length>max)throw new Error('参数格式或长度不正确');return value;}
function integer(value:unknown,min:number,max:number):number|undefined {
  if(value===undefined||value==='')return undefined;
  if(typeof value!=='string'||!/^\d+$/.test(value))throw new Error('筛选条件应为整数');
  const n=Number(value);if(n<min||n>max)throw new Error(`数值范围应为 ${min}–${max}`);return n;
}
function query(q:Record<string,unknown>):AudienceQuery {
  const status=text(q.status) as FollowStatus|undefined;if(status&&!statuses.includes(status))throw new Error('无效的跟进状态');
  const levelState=text(q.levelState) as 'known'|'unknown'|undefined;if(levelState&&!['known','unknown'].includes(levelState))throw new Error('无效的等级状态');
  const sort=text(q.sort) as AudienceQuery['sort'];if(sort&&!['recent','level','gifts'].includes(sort))throw new Error('无效的排序');
  const result:AudienceQuery={mode:mode(q.mode??'live'),taskId:text(q.taskId,100),search:text(q.search),minLevel:integer(q.minLevel,1,999),maxLevel:integer(q.maxLevel,1,999),minFanLevel:integer(q.minFanLevel,1,999),levelState,status,giftersOnly:q.giftersOnly==='true',sort,page:integer(q.page,1,1e6),pageSize:integer(q.pageSize,1,100)};
  if(result.minLevel&&result.maxLevel&&result.minLevel>result.maxLevel)throw new Error('最低等级不能大于最高等级');return result;
}
export interface ServiceReply {status:number;body:unknown;headers?:Record<string,string>;}
export class AudienceService extends EventEmitter {
  readonly collector:Collector;
  private timer:ReturnType<typeof setTimeout>|undefined;
  constructor(readonly store:Store,private runtime:{desktop?:boolean;dataFolder?:string}={}) {
    super();this.setMaxListeners(100);this.collector=new Collector(store,()=>this.notify());
  }
  private notify(){if(!this.timer)this.timer=setTimeout(()=>{this.timer=undefined;this.emit('change');},200);}
  async request(method:string,path:string,input?:unknown):Promise<ServiceReply> {
    try {
      if(typeof path!=='string'||!path.startsWith('/api/')||path.length>8192)throw new Error('无效的应用请求');
      const url=new URL(path,'http://local'),q=Object.fromEntries(url.searchParams),p=url.pathname;
      const body=(input&&typeof input==='object'&&!Array.isArray(input)?input:{}) as Record<string,unknown>;
      const ok=(body:unknown,status=200):ServiceReply=>({status,body});
      if(method==='GET'&&p==='/api/health')return ok({ok:true,version:'0.3.0'});
      if(method==='GET'&&p==='/api/state') {const m=mode(q.mode??'live'),taskId=text(q.taskId,100);return ok({tasks:this.store.tasks(m),summary:this.store.summary(m,taskId),events:this.store.events(m,taskId)});}
      if(method==='GET'&&p==='/api/audience')return ok(this.store.audience(query(q)));
      if(method==='GET'&&p==='/api/audience/detail') {const key=text(q.key,100);if(!key)throw new Error('缺少观众标识');const result=this.store.detail(mode(q.mode??'live'),key);return result?ok(result):ok({error:'观众不存在'},404);}
      if(method==='PATCH'&&p==='/api/audience/follow') {
        const m=mode(body.mode),key=text(body.key,100),status=body.status as FollowStatus,note=body.note;
        if(!key||!statuses.includes(status)||typeof note!=='string'||note.length>4000)throw new Error('请检查跟进状态和备注（最多 4000 字）');
        this.store.follow(m,key,status,note);this.notify();return ok({ok:true});
      }
      if(method==='GET'&&p==='/api/export') {const filter=query(q);return {status:200,body:[...this.store.csv(filter)].join(''),headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="audience-${filter.mode}-${new Date().toISOString().slice(0,10)}.csv"`}};}
      if(method==='POST'&&p==='/api/tasks') {const m=mode(body.mode??'live'),host=parseHost(body.host);const task=this.store.createTask(host,m);this.notify();return ok(task,201);}
      const taskRoute=p.match(/^\/api\/tasks\/([^/]+)\/(start|stop)$/);
      if(method==='POST'&&taskRoute) {
        const task=this.store.task(taskRoute[1]);if(!task||task.mode!=='live')return ok({error:'任务不存在'},404);
        if(taskRoute[2]==='start')this.collector.start(task);else await this.collector.stop(task.id);return ok({ok:true});
      }
      if(method==='GET'&&p==='/api/diagnostics')return ok({node:process.versions.node,connector:'2.5.0',database:'SQLite / WAL',desktop:Boolean(this.runtime.desktop),dataFolder:this.runtime.dataFolder,
        signingKeyConfigured:Boolean(process.env.EULER_API_KEY),proxyConfigured:Boolean(process.env.HTTPS_PROXY),maxConnections:3,activeConnections:this.collector.slots.size,
        notes:['数据保存在本机。','公共直播采集不要求 TikTok 登录凭据。','等级来自最近收到的事件；未知不等于 0 级。']});
      return ok({error:'接口不存在'},404);
    }catch(error){return {status:400,body:{error:safeError(error)}};}
  }
  async close(){if(this.timer)clearTimeout(this.timer);await this.collector.close();if(this.timer)clearTimeout(this.timer);this.removeAllListeners();}
}
