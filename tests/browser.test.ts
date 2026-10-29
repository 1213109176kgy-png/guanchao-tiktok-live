import test from 'node:test';
import assert from 'node:assert/strict';
import { livePage, tiktokUrl } from '../shared/browser.ts';
import type { BrowserState } from '../shared/browser.ts';
import { collectCurrentRoom } from '../server/quick-collect.ts';
import { Store } from '../server/store.ts';
test('TikTok browser restricts top-level URLs, including credential and host confusion',()=>{
  assert.equal(tiktokUrl('www.tiktok.com/@creator/live'),'https://www.tiktok.com/@creator/live');
  for(const v of ['file:///C:/test','http://www.tiktok.com/','https://tiktok.com.evil.example/','https://evil@www.tiktok.com/','https://www.tiktok.com:8080/','javascript:alert(1)'])assert.throws(()=>tiktokUrl(v));
});
test('live route is a candidate until evidence confirms on-air, offline remains distinct',()=>{
  assert.equal(livePage('https://www.tiktok.com/@Creator/live').kind,'candidate');
  assert.deepEqual(livePage('https://www.tiktok.com/@Creator/live',{roomId:'123',roomStatus:2}),{kind:'live',host:'creator',roomId:'123'});
  assert.equal(livePage('https://www.tiktok.com/@Creator/live',{roomId:'123',roomStatus:4}).kind,'offline');
  assert.equal(livePage('https://www.tiktok.com/@Creator/live',{livePlayer:true,liveChat:true}).kind,'live');
});
test('recommendations, profiles and videos never become a live room from unrelated metadata',()=>{
  const evidence={host:'someone',roomId:'123',roomStatus:2};
  for(const path of ['/','/foryou','/@someone','/@someone/video/123','/@someone/live-more'])assert.equal(livePage('https://www.tiktok.com'+path,evidence).kind,'browsing');
  assert.equal(livePage('https://www.tiktok.com/live').host,null);
  assert.deepEqual(livePage('https://www.tiktok.com/live',evidence),{kind:'live',host:'someone',roomId:'123'});
});
test('SPA transition cannot attach previous host metadata to the newly visited room',()=>{
  assert.deepEqual(livePage('https://www.tiktok.com/@next_host/live',{host:'previous_host',roomId:'123',roomStatus:2}),{kind:'candidate',host:'next_host',roomId:null});
});
test('quick collection creates once, starts once, resumes stopped tasks, and rejects stale or offline pages',async()=>{
  const store=new Store(':memory:');let starts=0;
  const service={request:async(_method:string,path:string,input?:unknown)=>{
    if(path==='/api/tasks')return {status:201,body:store.createTask((input as {host:string}).host,'live')};
    starts++;const id=path.split('/')[3];store.updateTask(id,{status:'connecting'});return {status:200,body:{ok:true}};
  }};
  const state:BrowserState={url:'https://www.tiktok.com/@qa_host/live',title:'Fixture',loading:false,error:null,canGoBack:false,canGoForward:false,kind:'live',host:'qa_host',roomId:'123',taskId:null,taskStatus:null,taskError:null};
  try{
    const first=await collectCurrentRoom(service,state,state.url),second=await collectCurrentRoom(service,state,state.url);
    assert.equal(first.taskId,second.taskId);assert.equal(starts,1);assert.equal(store.tasks('live').length,1);
    store.updateTask(first.taskId,{status:'stopped'});await collectCurrentRoom(service,state,state.url);assert.equal(starts,2);
    await assert.rejects(()=>collectCurrentRoom(service,state,'https://www.tiktok.com/@other/live'));
    await assert.rejects(()=>collectCurrentRoom(service,{...state,kind:'offline'},state.url));
    await assert.rejects(()=>collectCurrentRoom(service,{...state,loading:true},state.url));
  }finally{store.close();}
});
