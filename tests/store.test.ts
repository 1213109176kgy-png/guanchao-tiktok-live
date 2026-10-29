import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.ts';
import { normalizeEvent } from '../server/normalize.ts';

test('duplicates and cumulative gift streaks do not double count; survive reopen',()=>{
  const dir=mkdtempSync(join(tmpdir(),'audience-store-'));const path=join(dir,'test.sqlite');let store=new Store(path);
  try{
    const t=store.createTask('test_host','live');
    const payload=(id:string,count:number)=>({common:{msgId:id},user:{id:'123',displayId:'person',nickname:'Person',payGrade:{level:30}},gift:{id:'5655',name:'Rose'},giftId:'5655',groupId:'streak1',repeatCount:count});
    assert.equal(store.ingest(t.id,normalizeEvent('gift',payload('1',1))),true);
    assert.equal(store.ingest(t.id,normalizeEvent('gift',payload('1',1))),false);
    store.ingest(t.id,normalizeEvent('gift',payload('2',3)));
    store.ingest(t.id,normalizeEvent('gift',payload('3',3)));
    store.ingest(t.id,normalizeEvent('gift',payload('3',4)));
    assert.equal(store.audience({mode:'live'}).rows[0].gifts,4);
    store.follow('live','id:123','interested','=external()');store.updateTask(t.id,{status:'live'});store.close();
    store=new Store(path);
    assert.equal(store.tasks('live')[0].status,'stopped');
    const user=store.audience({mode:'live'}).rows[0];assert.equal(user.note,'=external()');assert.equal(user.status,'interested');
    store.ingest(t.id,normalizeEvent('gift',payload('4',5)));
    assert.equal(store.audience({mode:'live'}).rows[0].gifts,5);
    const csv=[...store.csv({mode:'live'})].join('');assert.ok(csv.includes("'=external()"));assert.ok(csv.includes("'123"));
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('room-specific fan levels, global observed gifter level, null preservation and mode separation',()=>{
  const store=new Store(':memory:');try{
    const a=store.createTask('host_a','live'),b=store.createTask('host_b','live'),demo=store.createTask('host_a','demo');
    const base={user:{id:'111',displayId:'viewer',nickname:'Viewer'}};
    store.ingest(a.id,normalizeEvent('chat',{...base,common:{msgId:'1'},user:{...base.user,payGrade:{level:22},fansClub:{data:{level:3}}},content:'One'},'2026-10-29T00:00:00Z'));
    store.ingest(b.id,normalizeEvent('chat',{...base,common:{msgId:'2'},user:{...base.user,payGrade:{level:23},fansClub:{data:{level:9}}},content:'Two'},'2026-10-29T00:01:00Z'));
    store.ingest(a.id,normalizeEvent('like',{...base,common:{msgId:'3'},count:4},'2026-10-29T00:02:00Z'));
    store.ingest(demo.id,normalizeEvent('chat',{...base,common:{msgId:'1'},content:'Demo'}));
    let result=store.audience({mode:'live'});assert.equal(result.total,1);assert.equal(result.rows[0].roomCount,2);assert.equal(result.rows[0].gifterLevel,23);
    assert.equal(result.rows[0].fanLevel,3);assert.equal(result.rows[0].fanRoom,'host_a');assert.equal(result.rows[0].comments,2);
    assert.equal(store.audience({mode:'live',taskId:b.id}).rows[0].fanLevel,9);
    store.follow('live','id:111','pending','Local');assert.equal(store.audience({mode:'demo'}).rows[0].status,'new');
    assert.equal(store.audience({mode:'live',minLevel:24}).total,0);assert.equal(store.audience({mode:'live',minLevel:20,status:'pending'}).total,1);
    assert.equal(store.audience({mode:'live',levelState:'unknown'}).total,0);assert.equal(store.summary('live').knownLevels,1);
    assert.equal(store.audience({mode:'live',search:'view%'}).total,0,'LIKE wildcards treated literally');
    assert.equal(store.detail('demo','id:111')?.events.length,1);
  }finally{store.close();}
});
test('unknown identities stay in event log and do not inflate audience counts',()=>{
  const s=new Store(':memory:');try{const task=s.createTask('host','live');s.ingest(task.id,normalizeEvent('member',{common:{msgId:'x'}}));
    assert.equal(s.summary('live').audience,0);assert.equal(s.summary('live').events,1);
  }finally{s.close();}
});
