import type { ServiceReply } from '../server/service.ts';
import type { BrowserState, BrowserBounds, BrowserAction } from './browser.ts';
export interface DesktopConfig {proxy:string;signingKeyConfigured:boolean;dataFolder:string;encryptionAvailable:boolean;}
export interface DesktopBridge {
  request(method:string,path:string,body?:unknown):Promise<ServiceReply>;
  onChange(callback:()=>void):()=>void;
  exportCsv(query:string):Promise<{canceled:boolean;path?:string}>;
  config():Promise<DesktopConfig>;
  saveConfig(config:{proxy:string;signingKey?:string;clearSigningKey?:boolean}):Promise<DesktopConfig>;
  openDataFolder():Promise<void>;
  browserState():Promise<BrowserState>;
  onBrowserState(callback:(state:BrowserState)=>void):()=>void;
  browserBounds(bounds:BrowserBounds):Promise<void>;
  browserNavigate(url:string):Promise<void>;
  browserAction(action:BrowserAction):Promise<void>;
  browserCollect():Promise<{taskId:string;host:string}>;
}
declare global {interface Window {desktop?:DesktopBridge;}}
