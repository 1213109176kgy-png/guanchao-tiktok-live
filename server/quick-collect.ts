import type { BrowserState } from '../shared/browser.ts';
import type { AudienceService } from './service.ts';
export async function collectCurrentRoom(service:Pick<AudienceService,'request'>,state:BrowserState,currentUrl:string){
  if(state.loading||state.error||!state.host||!['candidate','live'].includes(state.kind)||currentUrl!==state.url)throw new Error('请先进入一个具体的 TikTok 直播间，等待页面识别完成。');
  const result=await service.request('POST','/api/tasks',{mode:'live',host:state.host});
  if(result.status>=400)throw new Error((result.body as {error:string}).error);
  const task=result.body as {id:string;status:string};
  if(!['connecting','live','reconnecting'].includes(task.status)){
    const start=await service.request('POST',`/api/tasks/${task.id}/start`,{});
    if(start.status>=400)throw new Error((start.body as {error:string}).error);
  }
  return {taskId:task.id,host:state.host};
}
