import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { TikTokLiveConnection } from 'tiktok-live-connector';
import { Store } from '../server/store.ts';
import { Collector } from '../server/collector.ts';

class FakeClient extends EventEmitter {
  resolve!:(value:{roomId:string})=>void;reject!:(reason:Error)=>void;closed=0;
  promise=new Promise<{roomId:string}>((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});
  connect(){return this.promise;}async disconnect(){this.closed++;}
}
const turn=()=>new Promise<void>(r=>setImmediate(r));
test('stopping a pending connection prevents late events and late success from reopening task',async()=>{
  const store=new Store(':memory:'),fake=new FakeClient(),collector=new Collector(store,()=>{},()=>fake as unknown as TikTokLiveConnection);
  try{
    const task=store.createTask('example_host','live');collector.start(task);assert.equal(store.task(task.id)?.status,'connecting');
    await collector.stop(task.id);fake.emit('chat',{common:{msgId:'1'},user:{id:'1',displayId:'viewer'},content:'Late'});
    fake.resolve({roomId:'123'});await turn();
    assert.equal(store.task(task.id)?.status,'stopped');assert.equal(store.summary('live').events,0);assert.ok(fake.closed>=1);assert.equal(collector.slots.size,0);
  }finally{await collector.close();store.close();}
});
test('successful connection records modern events; failed connection releases its slot with useful error',async()=>{
  const store=new Store(':memory:'),clients:FakeClient[]=[];
  const collector=new Collector(store,()=>{},()=>{const c=new FakeClient();clients.push(c);return c as unknown as TikTokLiveConnection;});
  try{
    const task=store.createTask('example_host','live');collector.start(task);clients[0].resolve({roomId:'123'});await turn();
    assert.equal(store.task(task.id)?.status,'live');clients[0].emit('chat',{common:{msgId:'1'},user:{id:'123',displayId:'viewer',nickname:'Viewer'},content:'Hello'});
    assert.equal(store.summary('live').audience,1);await collector.stop(task.id);
    collector.start(task);clients[1].reject(new Error('ETIMEDOUT token=secret'));await turn();
    assert.equal(store.task(task.id)?.status,'error');assert.ok(store.task(task.id)?.error?.includes('网络'));assert.ok(!store.task(task.id)?.error?.includes('secret'));assert.equal(collector.slots.size,0);
  }finally{await collector.close();store.close();}
});
