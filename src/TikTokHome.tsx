import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleHelp, Globe2, LoaderCircle, Radio, RefreshCw, Search, Square, Waves } from 'lucide-react';
import type { BrowserState } from '../shared/browser.ts';
import type {} from '../shared/desktop.ts';
const initial:BrowserState={url:'https://www.tiktok.com/',title:'TikTok',loading:true,error:null,canGoBack:false,canGoForward:false,kind:'browsing',host:null,roomId:null,taskId:null,taskStatus:null,taskError:null};
export default function TikTokHome({visible,onTask}:{visible:boolean;onTask:(taskId:string)=>void}){
  const [state,setState]=useState<BrowserState>(initial),[address,setAddress]=useState(initial.url),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const viewport=useRef<HTMLDivElement>(null),editing=useRef(false),syncBounds=useRef(()=>{});
  useEffect(()=>{
    if(!window.desktop)return;
    const update=(next:BrowserState)=>{if(!next)return;setState(next);if(!editing.current)setAddress(next.url);syncBounds.current();};
    const off=window.desktop.onBrowserState(update);let canceled=false;
    const poll=()=>{void window.desktop!.browserState().then(s=>{if(!canceled)update(s);}).catch(()=>{});};poll();const timer=setInterval(poll,2000);
    return()=>{canceled=true;clearInterval(timer);off();};
  },[]);
  useEffect(()=>{
    if(!window.desktop)return;
    let frame=0;
    const sync=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const r=viewport.current?.getBoundingClientRect();if(r)void window.desktop!.browserBounds({x:r.x,y:r.y,width:r.width,height:r.height,visible:visible&&!state.error}).catch(()=>{});
    });};
    syncBounds.current=sync;const observer=new ResizeObserver(sync);if(viewport.current)observer.observe(viewport.current);
    window.addEventListener('resize',sync);window.addEventListener('scroll',sync,true);sync();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',sync);window.removeEventListener('scroll',sync,true);void window.desktop!.browserBounds({x:0,y:0,width:0,height:0,visible:false}).catch(()=>{});};
  },[visible,state.error]);
  async function navigate(e:FormEvent){e.preventDefault();setError('');try{await window.desktop?.browserNavigate(address);}catch(e){setError((e as Error).message);}}
  async function action(value:'back'|'forward'|'reload'|'stop'|'home'|'live'){setError('');try{await window.desktop?.browserAction(value);}catch(e){setError((e as Error).message);}}
  async function collect(){setError('');setBusy(true);try{await window.desktop!.browserCollect();setState(await window.desktop!.browserState());}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const active=state.taskStatus==='live',connecting=['connecting','reconnecting'].includes(state.taskStatus??'');
  const canCollect=Boolean(state.host&&['candidate','live'].includes(state.kind)&&!state.loading&&!state.error);
  const button=active?'采集中':connecting?'连接中…':state.taskStatus==='error'?'重试采集':state.taskStatus==='stopped'?'恢复采集':state.taskId?'开始采集':'采集此直播间';
  return <section className="tiktok-home" aria-label="TikTok 内嵌浏览器">
    <div className="browser-navigation"><div className="browser-history"><button className="icon-button" aria-label="网页后退" disabled={!state.canGoBack} onClick={()=>void action('back')}><ArrowLeft size={16}/></button><button className="icon-button" aria-label="网页前进" disabled={!state.canGoForward} onClick={()=>void action('forward')}><ArrowRight size={16}/></button><button className="icon-button" aria-label={state.loading?'停止网页加载':'刷新网页'} onClick={()=>void action(state.loading?'stop':'reload')}>{state.loading?<Square size={14}/>:<RefreshCw size={15}/>}</button></div><form onSubmit={e=>void navigate(e)}><Globe2 size={14}/><input aria-label="TikTok 网页地址" value={address} spellCheck={false} onChange={e=>setAddress(e.target.value)} onFocus={()=>editing.current=true} onBlur={()=>{editing.current=false;}}/><button type="submit" aria-label="打开 TikTok 地址"><ArrowRight size={15}/></button></form></div>
    {state.host&&<div className={`room-detection ${state.host?'detected':''}`}><div className="detection-icon">{state.kind==='live'?<Radio size={21}/>:<Search size={20}/>}</div><div className="detection-copy"><strong>{state.host?`@${state.host}`:state.loading?'正在打开 TikTok…':'浏览 TikTok，发现下一个直播间'}</strong><p>{state.error?'网页暂未连通，请检查网络设置':state.kind==='offline'?'主播未开播':state.host?(active?'正在采集这个直播间，切换页面不会停止任务':connecting?'正在连接采集引擎，请稍候…':state.kind==='live'?'已识别正在直播，可一键添加采集':'已识别直播页面，连接时会确认开播状态'):'登录后可正常浏览、刷视频；进入具体直播间后，这里会出现采集入口'}</p></div><div className="detection-actions">{state.taskId&&<button className="text-button" onClick={()=>onTask(state.taskId!)}>查看观众<ChevronRight size={14}/></button>}<button className={`button ${active?'collecting':'primary'}`} disabled={!canCollect||active||connecting||busy} onClick={()=>void collect()}>{busy||connecting?<LoaderCircle size={15} className="spinning"/>:active?<Check size={16}/>:<Radio size={16}/>} {busy?'正在添加…':state.host?button:'进入直播间后采集'}</button></div></div>}
    {(error||state.error||state.taskError)&&<div className="browser-warning" role="alert"><CircleHelp size={15}/><span>{error||state.error||state.taskError}</span></div>}
    <div className="browser-viewport" ref={viewport}>{!window.desktop?<div className="browser-placeholder"><Globe2 size={38}/><h3>请在桌面开发预览中使用</h3><p>内嵌 TikTok 支持登录和浏览，需要桌面窗口承载。</p></div>:<div className="browser-placeholder"><Waves size={38}/><h3>{state.error?'暂时无法连接 TikTok':'TikTok 网页加载中'}</h3><p>{state.error?'检查运行设置里的网络代理，然后点击刷新。':'网页将在这里直接显示；可在 TikTok 页面内登录。'}</p></div>}</div>
  </section>;
}
