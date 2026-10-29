import test from 'node:test';
import {demoProfiles,demoPayload} from '../server/demo.ts';
import {normalizeEvent} from '../server/normalize.ts';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { Store } from '../server/store.ts';
import { createApplication } from '../server/app.ts';

test('HTTP API supports live records, filters, follow-up, CSV, stop and rejects unsafe inputs',async()=>{
  const store=new Store(':memory:'),application=createApplication(store);const server=application.app.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const request=(path:string,body?:unknown,method='POST')=>fetch(url+path,body===undefined?{}:{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  try{
    let response=await request('/api/demo/start',{});assert.equal(response.status,404);
    response=await request('/api/state?mode=demo');assert.equal(response.status,400);
    const task=store.createTask('test_host','live'),taskId=task.id;store.updateTask(taskId,{status:'live'});
    demoProfiles.forEach((_,i)=>store.ingest(taskId,normalizeEvent('chat',demoPayload(i,i,'chat','api-fixture'))));
    const state=await (await request('/api/state?mode=live')).json() as any;
    assert.equal(state.summary.audience,32);assert.equal(state.tasks[0].status,'live');assert.equal(state.summary.knownLevels,24);

    const list=await (await request('/api/audience?mode=live&minLevel=30&sort=level')).json() as any;
    assert.ok(list.total>0);assert.ok(list.rows.every((x:any)=>x.gifterLevel>=30));
    const key=list.rows[0].key;
    response=await request('/api/audience/follow',{mode:'live',key,status:'contacted',note:'Test note'},'PATCH');assert.equal(response.status,200);
    const detail=await (await request('/api/audience/detail?mode=live&key='+encodeURIComponent(key))).json() as any;
    assert.equal(detail.user.note,'Test note');assert.ok(detail.events[0].raw.user);
    const csv=await (await request('/api/export?mode=live&minLevel=30')).text();assert.ok(csv.includes('Test note'));assert.ok(csv.includes('真实'));
    response=await request(`/api/tasks/${taskId}/stop`,{});assert.equal(response.status,200);assert.equal(application.collector.slots.size,0);
    response=await request('/api/tasks',{mode:'live',host:'https://example.org/@foo'});assert.equal(response.status,400);
    response=await request('/api/audience?mode=live&minLevel=-1');assert.equal(response.status,400);
    response=await request('/api/audience?mode=live&minLevel=40&maxLevel=10');assert.equal(response.status,400);
    response=await fetch(url+'/api/tasks',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.example'},body:'{}'});assert.equal(response.status,403);
    response=await fetch(url+'/api/tasks',{method:'POST',body:'{}'});assert.equal(response.status,415);
    const badHost=await new Promise<number|undefined>((resolve,reject)=>{const req=httpRequest(url+'/api/health',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();});assert.equal(badHost,403);
  }finally{await application.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));store.close();}
});
