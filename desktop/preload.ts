import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '../shared/desktop.ts';
const bridge:DesktopBridge={
  request:(method,path,body)=>ipcRenderer.invoke('audience:request',method,path,body),
  exportCsv:(query)=>ipcRenderer.invoke('audience:export',query),
  onChange:(callback)=>{const listener=()=>callback();ipcRenderer.on('audience:changed',listener);return()=>ipcRenderer.removeListener('audience:changed',listener);},
  config:()=>ipcRenderer.invoke('audience:config'),
  saveConfig:(config)=>ipcRenderer.invoke('audience:save-config',config),
  openDataFolder:()=>ipcRenderer.invoke('audience:open-data'),
  browserState:()=>ipcRenderer.invoke('tiktok:state'),
  onBrowserState:(callback)=>{const listener=(_event:unknown,state:Parameters<typeof callback>[0])=>callback(state);ipcRenderer.on('tiktok:state',listener);return()=>ipcRenderer.removeListener('tiktok:state',listener);},
  browserBounds:(bounds)=>ipcRenderer.invoke('tiktok:bounds',bounds),
  browserNavigate:(url)=>ipcRenderer.invoke('tiktok:navigate',url),
  browserAction:(action)=>ipcRenderer.invoke('tiktok:action',action),
  browserCollect:()=>ipcRenderer.invoke('tiktok:collect'),
};
contextBridge.exposeInMainWorld('desktop',bridge);
