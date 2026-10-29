import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, ArrowUpRight, AudioLines, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Copy, Database, Globe2, ExternalLink, Filter, FolderHeart, Layers3, LoaderCircle, MoreHorizontal, Play, Plus, Radio, Search, Settings2, ShieldCheck, Square, Users, Waves, Wifi, X } from 'lucide-react';
import type { Audience, AudienceQuery, FollowStatus, StoredEvent, Summary, Task } from '../shared/types.ts';
import type {} from '../shared/desktop.ts';
import DesktopSettings from './DesktopSettings.tsx';
import TikTokHome from './TikTokHome.tsx';

type Page='home'|'audience'|'tasks'|'events'|'settings';
type State={tasks:Task[];summary:Summary;events:StoredEvent[]};
type Detail={user:Audience;rooms:{host:string;fanLevel:number|null;fanObservedAt:string|null;firstSeen:string;lastSeen:string;comments:number;gifts:number}[];events:StoredEvent[]};
const labels:Record<FollowStatus,string>={new:'未跟进',pending:'待联系',contacted:'已联系',interested:'有意向',closed:'已结束'};
const taskLabels={idle:'未启动',connecting:'连接中',live:'采集中',reconnecting:'重连中',stopped:'已停止',error:'连接失败'};
const eventLabels={chat:'评论',gift:'送礼',like:'点赞',member:'入场',follow:'关注',share:'分享',badge:'徽章'};
const emptySummary:Summary={audience:0,knownLevels:0,highLevel:0,events:0,giftUsers:0,activeTasks:0};
const n=(v:number)=>new Intl.NumberFormat('zh-CN').format(v);
function time(v:string|null,full=false){if(!v)return '—';const d=new Date(v);return full?d.toLocaleString('zh-CN',{hour12:false}):d.toLocaleTimeString('zh-CN',{hour12:false,hour:'2-digit',minute:'2-digit'});}
async function api<T>(url:string,options?:RequestInit):Promise<T>{
  if(window.desktop){const result=await window.desktop.request(options?.method??'GET',url,typeof options?.body==='string'?JSON.parse(options.body):undefined);
    const data=result.body as T&{error?:string};if(result.status>=400)throw new Error(data.error??'请求失败，请重试');return data;}
  const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options?.headers}});
  const data=await response.json();if(!response.ok)throw new Error(data.error??'请求失败，请重试');return data;
}
const post=<T,>(url:string,body:unknown={})=>api<T>(url,{method:'POST',body:JSON.stringify(body)});
function Avatar({user,large=false}:{user:Pick<Audience,'nickname'|'avatar'>;large?:boolean}){
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[user.avatar]);
  const hue=[...user.nickname].reduce((a,c)=>a+c.charCodeAt(0),0)%6;
  return <span className={`avatar hue-${hue} ${large?'large':''}`}>{user.avatar&&!failed?<img src={user.avatar} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:user.nickname.slice(0,1).toUpperCase()}</span>;
}
function Level({value,fan=false}:{value:number|null;fan?:boolean}){return value===null?<span className="unknown">未知</span>:<span className={`level ${fan?'fan':value>=30?'gold':''}`}><span>{fan?'♡':'◇'}</span> Lv.{value}</span>;}
function Modal({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement;const el=ref.current;
    const elements=()=>el?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]');
    elements()?.[0]?.focus();
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){
      const all=elements();if(!all?.length)return;const first=all[0],last=all[all.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }};document.addEventListener('keydown',key);const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=previousOverflow;previous?.focus();};
  },[onClose]);
  return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className={`modal ${wide?'wide':''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}><div className="modal-title"><h2>{title}</h2><button className="icon-button" aria-label="关闭" onClick={onClose}><X size={20}/></button></div>{children}</div></div>;
}
export default function App(){
  const mode='live';
  const [page,setPage]=useState<Page>(window.desktop?'home':'audience'),[taskId,setTaskId]=useState('');
  const [state,setState]=useState<State>({tasks:[],summary:emptySummary,events:[]});
  const [audience,setAudience]=useState<{rows:Audience[];total:number}>({rows:[],total:0});
  const [search,setSearch]=useState(''),[debounced,setDebounced]=useState(''),[minLevel,setMinLevel]=useState(''),[maxLevel,setMaxLevel]=useState('');
  const [levelState,setLevelState]=useState(''),[minFanLevel,setMinFanLevel]=useState(''),[status,setStatus]=useState(''),[giftersOnly,setGiftersOnly]=useState(false);
  const [sort,setSort]=useState('recent'),[currentPage,setCurrentPage]=useState(1),[moreFilters,setMoreFilters]=useState(false);
  const [loading,setLoading]=useState(true),[connected,setConnected]=useState(false),[error,setError]=useState('');
  const [toast,setToast]=useState(''),[busy,setBusy]=useState(''),[newTask,setNewTask]=useState(false),[host,setHost]=useState(''),[formError,setFormError]=useState('');
  const [detail,setDetail]=useState<Detail|null>(null),[selectedKey,setSelectedKey]=useState(''),[note,setNote]=useState(''),[followStatus,setFollowStatus]=useState<FollowStatus>('new');
  const [diagnostics,setDiagnostics]=useState<Record<string,any>|null>(null),[help,setHelp]=useState(false);
  const sequence=useRef(0),refreshTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const closeNew=useCallback(()=>setNewTask(false),[]),closeDetail=useCallback(()=>{setSelectedKey('');setDetail(null);},[]),closeHelp=useCallback(()=>setHelp(false),[]);
  const params=new URLSearchParams({mode,page:String(currentPage),pageSize:'15',sort});
  if(taskId)params.set('taskId',taskId);if(debounced)params.set('search',debounced);
  if(minLevel)params.set('minLevel',minLevel);if(maxLevel)params.set('maxLevel',maxLevel);
  if(minFanLevel)params.set('minFanLevel',minFanLevel);if(levelState)params.set('levelState',levelState);
  if(status)params.set('status',status);if(giftersOnly)params.set('giftersOnly','true');
  const queryString=params.toString();
  const refresh=useCallback(async()=>{
    const seq=++sequence.current;
    try{
      const [s,a]=await Promise.all([api<State>(`/api/state?mode=${mode}${taskId?'&taskId='+encodeURIComponent(taskId):''}`),api<{rows:Audience[];total:number}>(`/api/audience?${queryString}`)]);
      if(seq!==sequence.current)return;setState(s);setAudience(a);setError('');
    }catch(e){if(seq===sequence.current)setError((e as Error).message);}finally{if(seq===sequence.current)setLoading(false);}
  },[mode,taskId,queryString]);
  useEffect(()=>{setLoading(true);void refresh();return()=>{sequence.current++;};},[refresh]);
  useEffect(()=>{const timer=setTimeout(()=>setDebounced(search),250);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{setCurrentPage(1);},[mode,taskId,debounced,minLevel,maxLevel,minFanLevel,levelState,status,giftersOnly,sort]);
  useEffect(()=>{
    if(window.desktop){setConnected(true);const off=window.desktop.onChange(()=>{if(!refreshTimer.current)refreshTimer.current=setTimeout(()=>{refreshTimer.current=undefined;void refresh();},300);});
      const poll=setInterval(()=>void refresh(),15000);return()=>{off();clearInterval(poll);if(refreshTimer.current)clearTimeout(refreshTimer.current);refreshTimer.current=undefined;};}
    const stream=new EventSource('/api/updates');stream.onopen=()=>setConnected(true);stream.onerror=()=>setConnected(false);
    const listener=()=>{if(!refreshTimer.current)refreshTimer.current=setTimeout(()=>{refreshTimer.current=undefined;void refresh();},500);};
    stream.addEventListener('change',listener);const poll=setInterval(()=>void refresh(),15000);
    return()=>{stream.close();clearInterval(poll);if(refreshTimer.current)clearTimeout(refreshTimer.current);refreshTimer.current=undefined;};
  },[refresh]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(t);},[toast]);
  useEffect(()=>{if(page==='settings')void api<Record<string,any>>('/api/diagnostics').then(setDiagnostics).catch(e=>setToast(e.message));},[page]);
  const reset=()=>{setSearch('');setDebounced('');setMinLevel('');setMaxLevel('');setMinFanLevel('');setLevelState('');setStatus('');setGiftersOnly(false);setCurrentPage(1);};
  const resetWorkspace=()=>{setTaskId('');setAudience({rows:[],total:0});setState({tasks:[],summary:emptySummary,events:[]});reset();closeDetail();};
  const action=async(id:string,fn:()=>Promise<unknown>,success?:string)=>{setBusy(id);try{await fn();await refresh();if(success)setToast(success);}catch(e){setToast((e as Error).message);}finally{setBusy('');}};
  async function createTask(e:FormEvent){e.preventDefault();setFormError('');setBusy('create');try{
    const task=await post<Task>('/api/tasks',{host,mode:'live'});await post(`/api/tasks/${task.id}/start`);
    resetWorkspace();setTaskId(task.id);setNewTask(false);setHost('');setPage('audience');setToast('任务已创建，正在连接直播间');
  }catch(e){setFormError((e as Error).message);}finally{setBusy('');}}
  const openDetail=async(user:Audience)=>{setSelectedKey(user.key);setDetail(null);try{
    const d=await api<Detail>(`/api/audience/detail?mode=${mode}&key=${encodeURIComponent(user.key)}`);setDetail(d);setNote(d.user.note);setFollowStatus(d.user.status);
  }catch(e){setToast((e as Error).message);setSelectedKey('');}};
  const saveFollow=()=>action('save',()=>api('/api/audience/follow',{method:'PATCH',body:JSON.stringify({mode,key:selectedKey,status:followStatus,note})}),'跟进记录已保存');
  const copy=(value:string)=>void navigator.clipboard.writeText(value).then(()=>setToast('已复制')).catch(()=>setToast('复制失败，请手动选择复制'));
  const exportCsv=async()=>{setBusy('export');try{if(window.desktop){const result=await window.desktop.exportCsv(queryString);if(!result.canceled)setToast('观众名单已保存到所选位置');return;}const res=await fetch(`/api/export?${queryString}`);if(!res.ok){const r=await res.json();throw new Error(r.error);}
    const blob=await res.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`观潮观众-真实-${new Date().toLocaleDateString('sv-SE')}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setToast('已导出全部符合当前筛选条件的观众');
  }catch(e){setToast((e as Error).message);}finally{setBusy('');}};
  const s=state.summary,selectedTask=state.tasks.find(t=>t.id===taskId),filterCount=[minLevel,maxLevel,minFanLevel,levelState,status,giftersOnly].filter(Boolean).length;
  const titles={home:['首页','浏览 TikTok，遇见直播间，一键开始采集。'],audience:['观众工作台','从每一次互动，发现值得连接的人。'],tasks:['直播间管理','管理采集任务，查看每个直播间的连接状态。'],events:['实时互动','回看采集到的评论、礼物与观众动态。'],settings:['运行设置','查看本地运行状态与采集配置。']};
  const renderTask=(t:Task,compact=false)=><div className={`task-card ${compact?'compact':''}`} key={t.id}>
    <div className="task-card-top"><span className="room-icon"><Radio size={20}/></span><span className="task-identity"><strong>@{t.host}</strong><small>{t.roomId?`房间 ${t.roomId}`:'尚未获取房间信息'}</small></span><span className={`task-status ${t.status}`}><i/>{taskLabels[t.status]}</span></div>
    {t.error&&<div className="task-error">{t.error}</div>}
    <div className="task-numbers"><span>已记录观众 <b>{n(t.audienceCount)}</b></span><span>互动事件 <b>{n(t.eventCount)}</b></span><span>在线人数 <b>{t.viewerCount===null?'—':n(t.viewerCount)}</b></span></div>
    <div className="task-card-bottom"><small>{t.startedAt?`最近启动 ${time(t.startedAt,true)}`:'等待开始采集'}</small><div>
      <button className="text-button" onClick={()=>{setTaskId(t.id);setPage('audience');}}>查看观众<ArrowRight size={14}/></button>
      {['live','connecting','reconnecting'].includes(t.status)?<button className="button small" disabled={!!busy} onClick={()=>void action(t.id,()=>post(`/api/tasks/${t.id}/stop`),'采集已停止，已保存的数据会保留')}><Square size={13}/>停止</button>:<button className="button small primary" disabled={!!busy} onClick={()=>void action(t.id,()=>post(`/api/tasks/${t.id}/start`))}><Play size={13}/>{t.status==='error'?'重试':'启动'}</button>}
    </div></div>
  </div>;
  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={e=>{e.preventDefault();setPage('audience');}}><span className="brand-mark"><Waves size={25}/></span><span>观潮<small>LIVE AUDIENCE</small></span></a>
      <div className="workspace-label">本地工作空间 <span>LOCAL</span></div>
      <nav aria-label="主导航">{([
        ['home',Globe2,'首页'],['audience',Users,'观众工作台'],['tasks',Radio,'直播间管理'],['events',Activity,'实时互动'],['settings',Settings2,'运行设置'],
      ] as const).map(([key,Icon,label])=><button key={key} className={page===key?'active':''} onClick={()=>setPage(key)}><Icon size={19}/>{label}{key==='tasks'&&s.activeTasks>0&&<em>{s.activeTasks}</em>}</button>)}</nav>
      <div className="sidebar-guide"><span className="guide-art"><AudioLines size={38}/><i/><i/><i/></span><strong>让每一次互动有迹可循</strong><p>记录观众，理解互动，<br/>把跟进留给更重要的人。</p><button onClick={()=>setHelp(true)}>查看使用指南 <ArrowUpRight size={14}/></button></div>
      <div className="sidebar-footer"><div><span className={`connection-dot ${connected?'online':''}`}/><span>{connected?(window.desktop?'本地引擎已就绪':'本地服务已连接'):'正在连接本地服务'}</span><ShieldCheck size={15}/></div><small>数据保存在本机 · v0.3.0</small></div>
    </aside>
    <div className={`workspace ${page==='home'?'home-workspace':''}`}>{page!=='home'&&<header className="topbar"><div className="breadcrumb">工作空间 <ChevronRight size={14}/><span>{titles[page][0]}</span></div><div className="topbar-right"><span className="local-badge"><Database size={13}/> 本地版</span><button className="icon-button" aria-label="使用帮助" onClick={()=>setHelp(true)}><CircleHelp size={19}/></button><span className="owner-avatar">本</span></div></header>}
      <main>{page!=='home'&&<section className="page-heading"><div><div className="eyebrow">TIKTOK LIVE · AUDIENCE DESK</div><h1>{titles[page][0]}</h1><p>{titles[page][1]}</p></div><div className="heading-actions"><button className="button primary" onClick={()=>{setFormError('');setNewTask(true);}}><Plus size={17}/>添加直播间</button></div></section>}
      {error&&<div className="error-banner" role="alert">{error}<button onClick={()=>void refresh()}>重试</button></div>}
      {page==='home'&&<TikTokHome visible={!newTask&&!help&&!selectedKey} onTask={id=>{resetWorkspace();setTaskId(id);setPage('audience');}}/>}
      {(page==='audience'||page==='events')&&<>
        <section className="metrics"><article><span>已记录观众<Users size={16}/></span><strong>{n(s.audience)}<small>人</small></strong><p>按用户标识去重</p></article><article><span>有送礼等级<Layers3 size={16}/></span><strong>{n(s.knownLevels)}<small>人</small></strong><p><i className="mini-bar"><i style={{width:`${s.audience?s.knownLevels/s.audience*100:0}%`}}/></i>{s.audience?Math.round(s.knownLevels/s.audience*100):0}% 字段可用</p></article><article className="metric-featured"><span>等级 ≥ 20<FolderHeart size={16}/></span><strong>{n(s.highLevel)}<small>人</small></strong><p>送礼等级达到筛选阈值</p></article><article><span>已接收互动<Activity size={16}/></span><strong>{n(s.events)}<small>次</small></strong><p>{s.activeTasks>0?<><span className="dot-green"/>{s.activeTasks} 个直播间运行中</>:'当前没有运行中的直播间'}</p></article></section>
        <div className="room-tabs"><button className={!taskId?'active':''} onClick={()=>setTaskId('')}><Radio size={15}/>全部直播间<span>{state.tasks.length}</span></button>{state.tasks.map(t=><button key={t.id} className={taskId===t.id?'active':''} onClick={()=>setTaskId(t.id)}><i className={`room-dot ${t.status==='live'?'on':''}`}/>@{t.host}</button>)}</div>
        {selectedTask&&<div className={`selected-task ${selectedTask.status==='error'?'has-error':''}`}><div><span className={`task-status ${selectedTask.status}`}><i/>{taskLabels[selectedTask.status]}</span><span>{selectedTask.error??(selectedTask.status==='live'?'正在接收直播间互动事件':selectedTask.status==='connecting'?'正在解析直播间并建立连接…':'已保存的观众与互动仍可查看')}</span></div>{['live','connecting','reconnecting'].includes(selectedTask.status)?<button className="text-button" disabled={!!busy} onClick={()=>void action(taskId,()=>post(`/api/tasks/${taskId}/stop`))}><Square size={13}/>停止采集</button>:<button className="text-button" disabled={!!busy} onClick={()=>void action(taskId,()=>post(`/api/tasks/${taskId}/start`))}><Play size={13}/>启动采集</button>}</div>}
      </>}
      {page==='audience'&&<section className="audience-panel">
        <div className="panel-header"><div><h2>观众名单 <span>{n(audience.total)}</span></h2><p>筛选观众，查看互动记录与跟进状态</p></div><button className="button" disabled={!audience.total||!!busy} onClick={()=>void exportCsv()}><ArrowDownToLine size={15}/>{busy==='export'?'导出中…':'导出 CSV'}</button></div>
        <div className="filter-bar"><label className="search-field"><Search size={17}/><input aria-label="搜索观众" placeholder="搜索昵称、TikTok 账号或用户 ID" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button aria-label="清空搜索" onClick={()=>setSearch('')}><X size={14}/></button>}</label><div className="level-range"><span>送礼等级</span><input type="number" min="1" max="999" aria-label="最低送礼等级" placeholder="最低" value={minLevel} onChange={e=>{setMinLevel(e.target.value);setLevelState('');}}/><span>—</span><input type="number" min="1" max="999" aria-label="最高送礼等级" placeholder="最高" value={maxLevel} onChange={e=>setMaxLevel(e.target.value)}/></div><button className={`button filter-toggle ${moreFilters?'selected':''}`} aria-expanded={moreFilters} onClick={()=>setMoreFilters(!moreFilters)}><Filter size={15}/>筛选{filterCount>0&&<b>{filterCount}</b>}<ChevronDown size={13}/></button></div>
        {moreFilters&&<div className="extra-filters"><label>等级字段<select aria-label="等级字段" value={levelState} onChange={e=>{setLevelState(e.target.value);if(e.target.value==='unknown'){setMinLevel('');setMaxLevel('');}}}><option value="">全部</option><option value="known">等级已知</option><option value="unknown">等级未知</option></select></label><label>最低粉丝团等级<input type="number" aria-label="最低粉丝团等级" min="1" max="999" placeholder="不限" value={minFanLevel} onChange={e=>setMinFanLevel(e.target.value)}/></label><label>跟进状态<select aria-label="筛选跟进状态" value={status} onChange={e=>setStatus(e.target.value)}><option value="">全部状态</option>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><button className="text-button" onClick={reset}>重置筛选</button></div>}
        <div className="table-toolbar"><div className="quick-filters"><button className={!minLevel&&!maxLevel&&!levelState&&!giftersOnly?'active':''} onClick={()=>{setMinLevel('');setMaxLevel('');setLevelState('');setGiftersOnly(false);}}>全部观众</button><button className={minLevel==='20'&&!giftersOnly?'active':''} onClick={()=>{setMinLevel('20');setMaxLevel('');setLevelState('');setGiftersOnly(false);}}>等级 ≥ 20</button><button className={giftersOnly?'active':''} onClick={()=>{setGiftersOnly(true);setMinLevel('');setMaxLevel('');setLevelState('');}}>有送礼记录</button><button className={levelState==='unknown'?'active':''} onClick={()=>{setLevelState('unknown');setMinLevel('');setMaxLevel('');setGiftersOnly(false);}}>等级未知</button></div><label className="sort-label">排序<select aria-label="观众排序" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">最近出现</option><option value="level">送礼等级优先</option><option value="gifts">礼物数量优先</option></select></label></div>
        <div className="table-scroll"><table><thead><tr><th>观众</th><th>送礼等级 <span title="最近收到的送礼等级，非实时持续查询">ⓘ</span></th><th>粉丝团等级</th><th>互动记录</th><th>最近出现</th><th>跟进状态</th><th className="last-th">操作</th></tr></thead><tbody>{audience.rows.map(user=><tr key={user.key}><td><button className="user-cell" onClick={()=>void openDetail(user)}><Avatar user={user}/><span><strong>{user.nickname}</strong><small>{user.handle?'@'+user.handle:'ID '+user.userId}</small></span></button></td><td><Level value={user.gifterLevel}/></td><td title={user.fanRoom?`来源主播 @${user.fanRoom}`:''}><Level value={user.fanLevel} fan/></td><td><div className="interactions"><span>{n(user.comments)}<small>评论</small></span><i/><span className={user.gifts?'has-gifts':''}>{n(user.gifts)}<small>礼物</small></span></div></td><td><span className="time-cell" title={time(user.lastSeen,true)}>{time(user.lastSeen)}</span><small className="room-origin">@{user.fanRoom}</small></td><td><span className={`follow-status ${user.status}`}>{labels[user.status]}</span></td><td><button className="row-detail" onClick={()=>void openDetail(user)}>查看<ChevronRight size={14}/></button></td></tr>)}</tbody></table></div>
        {loading&&!audience.rows.length?<div className="empty-state"><LoaderCircle className="spinning" size={28}/><h3>正在读取本地数据</h3></div>:!audience.rows.length&&<div className="empty-state"><span className="empty-illustration"><Users size={34}/><i>＋</i></span><h3>{s.audience?'没有符合条件的观众':'等待第一位观众出现'}</h3><p>{s.audience?'试试调整等级范围、搜索词或跟进状态。':'添加正在直播的 TikTok 账号，开始记录观众与互动。'}</p>{s.audience?<button className="button" onClick={reset}>清除筛选</button>:<div><button className="button primary" onClick={()=>setNewTask(true)}><Plus size={16}/>添加直播间</button></div>}</div>}
        <div className="table-footer"><span>{audience.total?`共 ${n(audience.total)} 位观众 · 第 ${(currentPage-1)*15+1}–${Math.min(currentPage*15,audience.total)} 位`:'尚无观众记录'}</span><div><span>15 条 / 页</span><button className="icon-button" aria-label="上一页" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>p-1)}><ChevronLeft size={16}/></button><span className="page-number">{currentPage}</span><button className="icon-button" aria-label="下一页" disabled={currentPage*15>=audience.total} onClick={()=>setCurrentPage(p=>p+1)}><ChevronRight size={16}/></button></div></div>
      </section>}
      {page==='tasks'&&<section className="tasks-grid">{state.tasks.map(t=>renderTask(t))}<button className="add-task-card" onClick={()=>setNewTask(true)}><span><Plus size={23}/></span><strong>添加一个直播间</strong><small>输入主播 @账号或直播链接</small></button></section>}
      {page==='events'&&<section className="events-panel"><div className="panel-header"><div><h2>最近互动</h2><p>展示最近 80 条事件，匿名或无标识事件不会生成可联系的观众资料</p></div><span className="live-label"><span className={`connection-dot ${connected?'online':''}`}/>{connected?'实时更新':'连接中'}</span></div>{state.events.length?<div className="event-list">{state.events.map(e=><div className="event-item" key={e.id}><span className={`event-icon ${e.kind}`}><Activity size={16}/></span><div><strong>{e.nickname??'未提供身份'}</strong><span>{eventLabels[e.kind]}</span><p>{e.content}</p></div><small>@{e.host}<br/>{time(e.receivedAt,true)}</small></div>)}</div>:<div className="empty-state"><Activity size={32}/><h3>还没有互动事件</h3><p>启动直播间采集后，新的互动会出现在这里。</p></div>}</section>}
      {page==='settings'&&<section className="settings-grid">{window.desktop&&<DesktopSettings onSaved={()=>void api<Record<string,any>>('/api/diagnostics').then(setDiagnostics)}/>} <article className="settings-card"><h2><Database size={19}/>本地运行状态</h2>{diagnostics?<><dl><dt>Node.js</dt><dd>{diagnostics.node}</dd><dt>采集连接库</dt><dd>TikTok-Live-Connector {diagnostics.connector}</dd><dt>数据存储</dt><dd>{diagnostics.database}</dd><dt>签名服务密钥</dt><dd>{diagnostics.signingKeyConfigured?'已配置':'未配置 · 使用社区额度'}</dd><dt>网络代理</dt><dd>{diagnostics.proxyConfigured?'已配置':'未配置 · 直接连接'}</dd><dt>连接数量</dt><dd>{diagnostics.activeConnections} / {diagnostics.maxConnections}</dd></dl><p className="settings-hint">{window.desktop?'Windows 桌面版 · 无需本地服务器或 Node.js 安装。配置在左侧表单中保存。':'修改项目根目录的 .env 后重启应用生效。密钥不会显示在页面中。'}</p></>:<p>正在读取配置…</p>}</article><article className="settings-card"><h2><ShieldCheck size={19}/>数据与使用说明</h2><ul><li>采集记录保存在本机，可筛选、跟进和导出。</li><li>等级来自最近收到的互动，不代表持续实时查询。</li><li>送礼等级全局记录；粉丝团等级按来源直播间保存。</li><li>匿名观众不建立可联系的账号档案。</li><li>支持打开主页、人工跟进，不包含自动私信。</li></ul><button className="button" onClick={()=>setHelp(true)}>查看完整使用指南<ArrowRight size={15}/></button></article></section>}
      {page!=='home'&&<footer className="workspace-footer"><ShieldCheck size={14}/><span>未知等级不等于 0 级；采集人数不代表直播间全部在线观众。</span><span className="footer-brand">观潮 · LIVE AUDIENCE</span></footer>}
      </main>
    </div>
    {newTask&&<Modal title="添加 TikTok 直播间" onClose={closeNew}><form onSubmit={e=>void createTask(e)}><p className="modal-description">输入正在直播的主播账号，开始记录直播间里的观众互动。</p><label className="form-label" htmlFor="host">主播账号或直播链接</label><input className="form-input" id="host" value={host} onChange={e=>setHost(e.target.value)} placeholder="@creator 或 https://www.tiktok.com/@creator/live" required maxLength={250}/><div className="form-hint"><ShieldCheck size={16}/><span>公共直播采集无需 TikTok 登录密码。请确保当前网络能访问 TikTok。</span></div>{formError&&<div className="form-error" role="alert">{formError}</div>}<div className="modal-actions"><button type="button" className="button" onClick={closeNew}>取消</button><button className="button primary" disabled={!!busy}>{busy==='create'?<LoaderCircle className="spinning" size={16}/>:<Radio size={16}/>}创建并开始采集</button></div></form></Modal>}
    {selectedKey&&<Modal title="观众详情" onClose={closeDetail} wide>{!detail?<div className="empty-state"><LoaderCircle className="spinning"/>正在读取观众资料</div>:<>
      <div className="profile-heading"><Avatar user={detail.user} large/><div><h3>{detail.user.nickname}</h3><p>{detail.user.handle?'@'+detail.user.handle:'未提供 TikTok 用户名'}</p><button className="copy-id" onClick={()=>copy(detail.user.userId??selectedKey)}>ID {detail.user.userId??'未知'}<Copy size={12}/></button></div>{detail.user.handle?<a className="button" target="_blank" rel="noopener noreferrer" href={`https://www.tiktok.com/@${encodeURIComponent(detail.user.handle)}`}>打开主页<ExternalLink size={14}/></a>:<span className="unknown">暂无主页账号</span>}</div>
      <div className="profile-level"><div><small>最近观测送礼等级</small><Level value={detail.user.gifterLevel}/></div><p>观测于 {time(detail.user.levelObservedAt,true)}<br/>未收到新的等级字段时，会保留最近已知值。</p></div>
      <div className="detail-section"><h3>来源直播间 <span>{detail.rooms.length}</span></h3>{detail.rooms.map(r=><div className="profile-room" key={r.host}><div><strong>@{r.host}</strong><small>最近出现 {time(r.lastSeen,true)}</small></div><div><small>粉丝团等级</small><Level value={r.fanLevel} fan/></div><span>{r.comments} 评论 · {r.gifts} 礼物</span></div>)}</div>
      <div className="detail-section"><h3>人工跟进</h3><label className="form-label" htmlFor="follow-status">跟进状态</label><select className="form-input" id="follow-status" value={followStatus} onChange={e=>setFollowStatus(e.target.value as FollowStatus)}>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><label className="form-label" htmlFor="note">跟进备注</label><textarea id="note" className="form-input" maxLength={4000} rows={3} placeholder="记录沟通进展、意向或下次跟进事项…" value={note} onChange={e=>setNote(e.target.value)}/><div className="note-actions"><small>{note.length} / 4000</small><button className="button primary" disabled={!!busy} onClick={()=>void saveFollow()}><Check size={15}/>{busy==='save'?'保存中…':'保存跟进'}</button></div></div>
      <div className="detail-section"><h3>最近互动与字段证据</h3><div className="detail-events">{detail.events.slice(0,12).map(e=><details key={e.id}><summary><span className="event-type">{eventLabels[e.kind]}</span><span>{e.content}</span><small>{time(e.receivedAt)}</small></summary><div className="evidence"><p>来源 @{e.host} · {time(e.receivedAt,true)}</p><p>本次事件：送礼等级 {e.gifterLevel??'未知'} · 粉丝团等级 {e.fanLevel??'未知'}</p><pre>{JSON.stringify(e.raw,null,2)}</pre></div></details>)}</div></div>
    </>}</Modal>}
    {help&&<Modal title="开始使用观潮" onClose={closeHelp}><div className="help-content"><ol><li><strong>添加正在直播的账号</strong><p>点击“添加直播间”，输入 TikTok 主播 @账号或完整直播链接。</p></li><li><strong>查看连接与事件</strong><p>成功连接后会记录收到事件的观众。连接失败时请查看直播间状态，并检查网络、主播开播状态及签名服务额度。</p></li><li><strong>筛选与跟进</strong><p>按送礼等级、粉丝团等级或跟进状态筛选；查看详情、保存备注、导出 CSV。可打开有效账号的 TikTok 主页，私信能力由 TikTok 决定。</p></li></ol><div className="help-note">{window.desktop?'数据保存在 Windows 用户数据目录，可在运行设置中打开。':'数据位置：项目目录 data/audience.sqlite。'}停止任务或重启应用会保留记录，任务需手动重新启动。</div><p>本地版最多同时采集 3 个直播间。当前不包含自动私信；采集核心为非官方接口，平台变化可能影响可用性。</p></div><div className="modal-actions"><button className="button primary" onClick={closeHelp}>知道了<Check size={15}/></button></div></Modal>}
    {toast&&<div className="toast" role="status"><CheckCircle2 size={17}/>{toast}</div>}
  </div>;
}
