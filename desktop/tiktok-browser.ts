import { WebContentsView, session, type BrowserWindow, type Session } from 'electron';
import { AudienceService } from '../server/service.ts';
import { tiktokUrl, livePage, type BrowserState, type BrowserBounds, type BrowserAction } from '../shared/browser.ts';
import { probeTikTokPage } from './page-probe.ts';
import { safeError } from '../server/collector.ts';
import { collectCurrentRoom } from '../server/quick-collect.ts';

export class TikTokBrowser {
  readonly view:WebContentsView;
  readonly browserSession:Session;
  private desiredBounds:BrowserBounds={x:0,y:0,width:0,height:0,visible:false};
  private timer:ReturnType<typeof setInterval>;
  private probing=false;private disposed=false;private revision=0;private published='';
  private state:BrowserState={url:'https://www.tiktok.com/',title:'TikTok',loading:false,error:null,canGoBack:false,canGoForward:false,kind:'browsing',host:null,roomId:null,taskId:null,taskStatus:null,taskError:null};
  private onService=()=>this.publish();
  constructor(private window:BrowserWindow,private service:AudienceService){
    this.browserSession=session.fromPartition('persist:tiktok-browser');
    this.browserSession.setPermissionRequestHandler((_contents,permission,callback)=>callback(permission==='fullscreen'));
    this.view=new WebContentsView({webPreferences:{session:this.browserSession,contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
    this.view.setBackgroundColor('#101010');this.view.setVisible(false);window.contentView.addChildView(this.view);
    const web=this.view.webContents;
    web.setWindowOpenHandler(({url})=>{
      try{const target=new URL(url);if(target.protocol!=='https:')return {action:'deny'};
        if(target.hostname==='tiktok.com'||target.hostname.endsWith('.tiktok.com')){void this.navigate(target.href).catch(()=>{});return {action:'deny'};}
        if(this.authUrl(target))return {action:'allow',overrideBrowserWindowOptions:{parent:window,width:560,height:780,webPreferences:{session:this.browserSession,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}}};
      }catch{}return {action:'deny'};
    });
    web.on('did-create-window',popup=>{popup.webContents.on('will-navigate',(event,url)=>{try{const link=new URL(url);if(!this.authUrl(link)&&!this.isTikTok(link))event.preventDefault();}catch{event.preventDefault();}});});
    web.on('will-navigate',(event,url)=>{try{if(!this.isTikTok(new URL(url)))event.preventDefault();}catch{event.preventDefault();}});
    web.on('will-redirect',(event,url)=>{try{if(!this.isTikTok(new URL(url)))event.preventDefault();}catch{event.preventDefault();}});
    web.on('did-start-navigation',(_event,url,isInPlace,isMainFrame)=>{
      if(!isMainFrame)return;this.revision++;this.state={...this.state,url,error:null,kind:'browsing',host:null,roomId:null,taskId:null,taskStatus:null,taskError:null};
      if(!isInPlace)this.state.loading=true;this.publish();
    });
    web.on('did-start-loading',()=>{if(web.isLoadingMainFrame())this.state.loading=true;this.publish();});
    web.on('dom-ready',()=>{this.state.loading=false;this.publish();void this.probe();});
    web.on('did-stop-loading',()=>{this.state.loading=false;this.publish();void this.probe();});
    web.on('did-navigate-in-page',(_event,_url,isMainFrame)=>{if(isMainFrame)void this.probe();});
    web.on('page-title-updated',(_event,title)=>{this.state.title=title;this.publish();});
    web.on('did-fail-load',(_event,code,_description,url,isMainFrame)=>{
      if(!isMainFrame||code===-3)return;this.state={...this.state,url,loading:false,kind:'browsing',host:null,error:`TikTok 网页加载失败（${code}）。请检查网络或在运行设置中配置代理，然后刷新。`};this.publish();
    });
    web.on('render-process-gone',()=>{this.state.error='网页进程已退出，请点击刷新重新载入。';this.publish();});
    window.on('resize',()=>this.applyBounds());window.on('closed',()=>this.dispose());
    service.on('change',this.onService);this.timer=setInterval(()=>{if(this.desiredBounds.visible)void this.probe();},1800);
  }
  private isTikTok(url:URL){return url.protocol==='https:'&&(url.hostname==='tiktok.com'||url.hostname.endsWith('.tiktok.com'));}
  private authUrl(url:URL){return url.protocol==='https:'&&['accounts.google.com','appleid.apple.com','www.facebook.com','m.facebook.com'].includes(url.hostname);}
  async setProxy(proxy:string){await this.browserSession.setProxy(proxy?{mode:'fixed_servers',proxyRules:proxy}:{mode:'system'});await this.browserSession.closeAllConnections();}
  async navigate(value:string){
    const url=tiktokUrl(value);this.state.error=null;this.publish();
    try{await this.view.webContents.loadURL(url);}catch(error){
      // Chromium may cancel an earlier load when the user navigates, stops, or a
      // site replaces its document. A cancellation is not a network failure.
      const aborted=(error as {code?:string;errno?:number}).code==='ERR_ABORTED'||(error as {errno?:number}).errno===-3||String(error).includes('ERR_ABORTED');
      if(aborted||this.disposed)return;
      if(!this.state.error)this.state.error='网页未能打开：'+safeError(error);this.state.loading=false;this.publish();
    }
  }
  bounds(value:BrowserBounds){
    if(!value||typeof value.visible!=='boolean'||[value.x,value.y,value.width,value.height].some(v=>!Number.isFinite(v)))throw new Error('无效的浏览区域');
    this.desiredBounds=value;this.applyBounds();
  }
  private applyBounds(){
    if(this.disposed||this.window.isDestroyed())return;
    const [maxWidth,maxHeight]=this.window.getContentSize(),b=this.desiredBounds;
    const x=Math.max(0,Math.min(Math.round(b.x),maxWidth)),y=Math.max(0,Math.min(Math.round(b.y),maxHeight));
    const width=Math.max(0,Math.min(Math.round(b.width),maxWidth-x)),height=Math.max(0,Math.min(Math.round(b.height),maxHeight-y));
    this.view.setBounds({x,y,width,height});this.view.setVisible(b.visible&&width>0&&height>0);
  }
  snapshot():BrowserState {
    const task=this.state.host?this.service.store.tasks('live').find(t=>t.host===this.state.host):undefined;
    const web=this.view.webContents;
    return {...this.state,canGoBack:!web.isDestroyed()&&web.navigationHistory.canGoBack(),canGoForward:!web.isDestroyed()&&web.navigationHistory.canGoForward(),taskId:task?.id??null,taskStatus:task?.status??null,taskError:task?.error??null};
  }
  private publish(){if(this.disposed||this.window.isDestroyed())return;const snapshot=this.snapshot(),key=JSON.stringify(snapshot);if(key===this.published)return;this.published=key;this.window.webContents.send('tiktok:state',snapshot);}
  async probe(){
    const web=this.view.webContents;if(this.probing||this.disposed||web.isDestroyed()||this.state.error)return;
    const url=web.getURL();if(!url.startsWith('https://'))return;
    const rev=this.revision;this.probing=true;
    try{
      const evidence=await web.executeJavaScript(`(${probeTikTokPage.toString()})()`);
      if(this.disposed||web.isDestroyed()||rev!==this.revision||web.getURL()!==evidence.url)return;
      this.state={...this.state,url:evidence.url,...livePage(evidence.url,evidence)};this.publish();
    }catch{}finally{this.probing=false;}
  }
  async action(action:BrowserAction){
    const web=this.view.webContents;
    if(action==='home')await this.navigate('https://www.tiktok.com/');
    else if(action==='live')await this.navigate('https://www.tiktok.com/live');
    else if(action==='reload'){this.state.error=null;web.reload();}
    else if(action==='stop'){web.stop();this.state.loading=false;this.publish();}
    else if(action==='back'&&web.navigationHistory.canGoBack())web.navigationHistory.goBack();
    else if(action==='forward'&&web.navigationHistory.canGoForward())web.navigationHistory.goForward();
  }
  async collect(){
    await this.probe();
    try{return await collectCurrentRoom(this.service,this.snapshot(),this.view.webContents.getURL());}finally{this.publish();}
  }
  dispose(){if(this.disposed)return;this.disposed=true;clearInterval(this.timer);this.service.off('change',this.onService);if(!this.view.webContents.isDestroyed())this.view.webContents.close();}
}
