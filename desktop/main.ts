import { app, BrowserWindow, ipcMain, dialog, shell, Menu, safeStorage, type IpcMainInvokeEvent } from 'electron';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, appendFileSync } from 'node:fs';
import { Store } from '../server/store.ts';
import { AudienceService } from '../server/service.ts';
import { safeError } from '../server/collector.ts';
import { SignConfig } from 'tiktok-live-connector';
import type { DesktopConfig } from '../shared/desktop.ts';
import { TikTokBrowser } from './tiktok-browser.ts';
import type { BrowserAction } from '../shared/browser.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
app.setName('观潮');
if(process.env.GUANCHAO_DATA_DIR)app.setPath('userData',resolve(process.env.GUANCHAO_DATA_DIR));
else app.setPath('userData',join(app.getPath('appData'),'Guanchao'));
let window:BrowserWindow|null=null,store:Store|undefined,service:AudienceService|undefined,exiting=false;
let tiktokBrowser:TikTokBrowser|undefined;
const dataFolder=app.getPath('userData'),configPath=join(dataFolder,'settings.json');
interface SavedConfig {proxy?:string;encryptedSigningKey?:string;}
let config:SavedConfig={};
function viewConfig():DesktopConfig{return {proxy:config.proxy??'',signingKeyConfigured:Boolean(process.env.EULER_API_KEY),dataFolder,encryptionAvailable:safeStorage.isEncryptionAvailable()};}
function log(message:string){try{mkdirSync(dataFolder,{recursive:true});appendFileSync(join(dataFolder,'desktop.log'),new Date().toISOString()+' '+message+'\n');}catch{}}
function verify(event:IpcMainInvokeEvent){if(!window||event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame)throw new Error('不允许的窗口请求');}
function loadConfig(){
  if(existsSync(configPath))config=JSON.parse(readFileSync(configPath,'utf8'));
  else if(process.env.HTTPS_PROXY)config={proxy:process.env.HTTPS_PROXY};
  if(config.proxy)process.env.HTTPS_PROXY=config.proxy;
  if(config.encryptedSigningKey){if(!safeStorage.isEncryptionAvailable())throw new Error('Windows 密钥解密不可用，请检查当前 Windows 用户或恢复设置文件。');process.env.EULER_API_KEY=safeStorage.decryptString(Buffer.from(config.encryptedSigningKey,'base64'));}
}
function registerIpc(){
  ipcMain.handle('audience:request',async(event,method:unknown,path:unknown,body:unknown)=>{
    verify(event);if(typeof method!=='string'||!['GET','POST','PATCH'].includes(method)||typeof path!=='string'||path.startsWith('/api/export'))throw new Error('不允许的应用请求');
    if(JSON.stringify(body??{}).length>32768)throw new Error('请求内容过长');return service!.request(method,path,body);
  });
  ipcMain.handle('audience:export',async(event,query:unknown)=>{
    verify(event);if(typeof query!=='string'||query.length>8192)throw new Error('无效的导出筛选');
    const result=await service!.request('GET','/api/export?'+query);
    if(result.status!==200)throw new Error((result.body as {error:string}).error);
    const mode='真实';
    const date=new Date().toLocaleDateString('sv-SE');
    const output=await dialog.showSaveDialog(window!,{title:'导出观众名单',defaultPath:join(app.getPath('downloads'),`观潮观众-${mode}-${date}.csv`),filters:[{name:'CSV 表格',extensions:['csv']}]});
    if(output.canceled||!output.filePath)return {canceled:true};
    writeFileSync(output.filePath,String(result.body),'utf8');return {canceled:false,path:output.filePath};
  });
  ipcMain.handle('audience:config',(event)=>{verify(event);return viewConfig();});
  ipcMain.handle('audience:save-config',async(event,input:unknown)=>{
    verify(event);if(service!.collector.slots.size)throw new Error('请先停止所有采集任务，再保存网络设置。');
    if(!input||typeof input!=='object')throw new Error('配置格式不正确');
    const value=input as {proxy?:unknown;signingKey?:unknown;clearSigningKey?:unknown};
    if(typeof value.proxy!=='string'||value.proxy.length>500)throw new Error('代理地址格式不正确');
    const proxy=value.proxy.trim();if(proxy){const url=new URL(proxy);if(!['http:','https:'].includes(url.protocol)||!url.hostname)throw new Error('请输入 http:// 或 https:// 代理地址');if(url.username||url.password)throw new Error('此版本请使用无密码的本地代理地址。');}
    if(value.signingKey!==undefined&&(typeof value.signingKey!=='string'||value.signingKey.length>4096))throw new Error('签名密钥格式不正确');
    const next:SavedConfig={...config,proxy};let key=process.env.EULER_API_KEY??'';
    if(value.clearSigningKey===true){delete next.encryptedSigningKey;key='';}
    if(typeof value.signingKey==='string'&&value.signingKey.trim()) {
      if(!safeStorage.isEncryptionAvailable())throw new Error('当前 Windows 加密不可用，无法安全保存密钥。');
      key=value.signingKey.trim();next.encryptedSigningKey=safeStorage.encryptString(key).toString('base64');
    }
    await tiktokBrowser?.setProxy(proxy);
    const temp=configPath+'.tmp';writeFileSync(temp,JSON.stringify(next,null,2),'utf8');renameSync(temp,configPath);config=next;
    process.env.HTTPS_PROXY=proxy;process.env.EULER_API_KEY=key;SignConfig.cachedInstance=undefined;SignConfig.apiKey=key||undefined;
    return viewConfig();
  });
  ipcMain.handle('audience:open-data',async(event)=>{verify(event);const error=await shell.openPath(dataFolder);if(error)throw new Error(error);});
  ipcMain.handle('tiktok:state',(event)=>{verify(event);return tiktokBrowser?.snapshot();});
  ipcMain.handle('tiktok:bounds',(event,bounds)=>{verify(event);tiktokBrowser?.bounds(bounds);});
  ipcMain.handle('tiktok:navigate',async(event,url:unknown)=>{verify(event);if(typeof url!=='string'||url.length>4096)throw new Error('请输入有效的 TikTok 地址');await tiktokBrowser?.navigate(url);});
  ipcMain.handle('tiktok:action',async(event,action:unknown)=>{verify(event);if(typeof action!=='string'||!['back','forward','reload','stop','home','live'].includes(action))throw new Error('无效的浏览操作');await tiktokBrowser?.action(action as BrowserAction);});
  ipcMain.handle('tiktok:collect',async(event)=>{verify(event);if(!tiktokBrowser)throw new Error('内嵌浏览器尚未就绪');return tiktokBrowser.collect();});
}
async function createWindow(){
  window=new BrowserWindow({width:1440,height:1000,minWidth:1000,minHeight:700,title:'观潮 · TikTok 直播观众工作台',backgroundColor:'#f6f8f6',show:false,
    webPreferences:{preload:join(root,'desktop-dist/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  const indexPath=join(root,'dist/index.html'),indexUrl=pathToFileURL(indexPath).href;
  window.webContents.on('will-navigate',(event,url)=>{if(url.split('?')[0]!==indexUrl)event.preventDefault();});
  window.webContents.setWindowOpenHandler(({url})=>{
    try{const link=new URL(url);if(link.protocol==='https:'&&link.hostname==='www.tiktok.com'&&/^\/@[\w.]{2,24}$/.test(link.pathname))void shell.openExternal(link.href);}catch{}
    return {action:'deny'};
  });
  window.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  window.webContents.on('render-process-gone',(_event,details)=>log('Renderer exited: '+details.reason));
  window.once('ready-to-show',()=>window?.show());window.on('closed',()=>{window=null;});
  const owner=window;
  await owner.loadFile(indexPath);
  if(exiting||owner.isDestroyed())return;
  tiktokBrowser=new TikTokBrowser(owner,service!);
  await tiktokBrowser.setProxy(config.proxy??'');
  if(exiting||owner.isDestroyed())return;
  // Kept separate from the local application. No preload bridge or Node access is
  // granted to TikTok; its cookies stay in its own persistent browser session.
  void tiktokBrowser.navigate('https://www.tiktok.com/');
}
const lock=app.requestSingleInstanceLock();
if(!lock)app.quit();
else {
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
  app.whenReady().then(async()=>{
    app.setAppUserModelId('com.guanchao.audience');mkdirSync(dataFolder,{recursive:true});loadConfig();
    store=new Store(join(dataFolder,'audience.sqlite'));service=new AudienceService(store,{desktop:true,dataFolder});
    service.on('change',()=>{if(window&&!window.isDestroyed())window.webContents.send('audience:changed');});registerIpc();
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      {label:'观潮',submenu:[{label:'打开数据文件夹',click:()=>{void shell.openPath(dataFolder);}},{type:'separator'},{label:'退出',role:'quit'}]},
      {label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
      {label:'视图',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'},...(!app.isPackaged?[{role:'toggleDevTools' as const}]:[])]},
      {label:'帮助',submenu:[{label:'关于观潮',click:()=>{void dialog.showMessageBox({type:'info',title:'观潮',message:'观潮 · Windows 桌面版 0.2.0',detail:'本机采集与存储，无需部署服务器。采集需要联网访问 TikTok 和第三方签名服务。真实直播与等级仍需实测。'});}}]},
    ]));await createWindow();log('Started desktop '+app.getVersion()+' / Node '+process.versions.node);
  }).catch(error=>{if(exiting)return;log(safeError(error));dialog.showErrorBox('观潮启动失败',safeError(error));app.quit();});
  app.on('window-all-closed',()=>app.quit());
  app.on('before-quit',(event)=>{
    if(exiting||!service)return;event.preventDefault();exiting=true;
    tiktokBrowser?.dispose();void service.close().then(()=>{store?.close();app.quit();}).catch(error=>{log(safeError(error));app.exit(1);});
  });
}
