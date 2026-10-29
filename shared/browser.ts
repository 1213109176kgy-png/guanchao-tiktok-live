import type { TaskStatus } from './types.ts';
export type LivePageKind='browsing'|'candidate'|'live'|'offline';
export interface PageEvidence {
  url?:string;host?:string|null;roomId?:string|null;roomStatus?:number|null;
  livePlayer?:boolean;liveChat?:boolean;offline?:boolean;
}
export interface BrowserState {
  url:string;title:string;loading:boolean;error:string|null;canGoBack:boolean;canGoForward:boolean;
  kind:LivePageKind;host:string|null;roomId:string|null;taskId:string|null;taskStatus:TaskStatus|null;taskError:string|null;
}
export type BrowserAction='back'|'forward'|'reload'|'stop'|'home'|'live';
export interface BrowserBounds {x:number;y:number;width:number;height:number;visible:boolean;}
export function tiktokUrl(value:string):string {
  const input=value.trim();
  const url=new URL(/^https?:\/\//i.test(input)?input:'https://'+input);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!(url.hostname==='tiktok.com'||url.hostname.endsWith('.tiktok.com')))throw new Error('请输入 https://www.tiktok.com 的网页地址');
  return url.href;
}
export function livePage(urlValue:string,evidence:PageEvidence={}):{kind:LivePageKind;host:string|null;roomId:string|null} {
  let url:URL;try{url=new URL(tiktokUrl(urlValue));}catch{return {kind:'browsing',host:null,roomId:null};}
  const handle=url.pathname.match(/^\/@([\w.]{2,24})\/live\/?$/)?.[1]?.toLowerCase()??null;
  const hub=/^\/live\/?$/.test(url.pathname);
  const trustedHost=typeof evidence.host==='string'&&/^[\w.]{2,24}$/.test(evidence.host)?evidence.host.toLowerCase():null;
  const host=handle??(hub?trustedHost:null);
  if(!host)return {kind:'browsing',host:null,roomId:null};
  const roomId=typeof evidence.roomId==='string'&&/^\d+$/.test(evidence.roomId)&&evidence.roomId!=='0'?evidence.roomId:null;
  if(handle&&trustedHost&&handle!==trustedHost)return {kind:'candidate',host:handle,roomId:null};
  if(evidence.offline||[3,4].includes(Number(evidence.roomStatus)))return {kind:'offline',host,roomId};
  if((roomId&&evidence.roomStatus===2)||(evidence.livePlayer&&evidence.liveChat))return {kind:'live',host,roomId};
  // A /@creator/live route identifies a room, but does not prove that it is on air.
  return {kind:handle?'candidate':'browsing',host:handle,roomId};
}
