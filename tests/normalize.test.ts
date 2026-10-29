import test from 'node:test';
import assert from 'node:assert/strict';
import { User, WebcastChatMessage, BadgeStruct, PrivilegeLogExtra } from 'tiktok-live-proto/v3';
import { normalizeEvent, extractLevels, parseHost, csvCell } from '../server/normalize.ts';

test('modern v3 user fields: precise IDs, canonical handle, badge levels, avatar',()=>{
  const e=normalizeEvent('chat',{common:{msgId:'7654321098765432100'},user:{id:7654321098765432101n,displayId:'a.viewer',nickname:'观众',
    avatarThumb:{urlList:['https://example.com/avatar.jpg']},
    badgeList:[{priorityType:20,sceneType:8,privilegeLogExtra:{level:'32'}},{priorityType:10,sceneType:10,privilegeLogExtra:{level:'12'}}]},content:'hello'});
  assert.equal(e.userId,'7654321098765432101');assert.equal(e.userKey,'id:7654321098765432101');
  assert.equal(e.handle,'a.viewer');assert.equal(e.gifterLevel,32);assert.equal(e.fanLevel,12);assert.equal(e.content,'hello');assert.equal(e.avatar,'https://example.com/avatar.jpg');
});
test('missing, proto default zero, and unrelated badge numbers are not a known level',()=>{
  assert.deepEqual(extractLevels({payGrade:{level:0},badgeList:[{priorityType:20,sceneType:1,privilegeLogExtra:{level:'45'}},{priorityType:20,sceneType:8,combine:{str:'99'}}]}),{gifterLevel:null,fanLevel:null});
  assert.equal(normalizeEvent('member',{}).userKey,null);
  assert.equal(normalizeEvent('chat',{user:{id:7654321098765432101}}).userKey,null,'unsafe numeric IDs must be rejected');
  assert.equal(extractLevels({fansClub:{data:{level:0}},fansClubInfo:{fansLevel:'7'}}).fanLevel,7,'zero default must not hide a valid fallback');
});
test('legacy data remains readable without mixing gifter and fan levels',()=>{
  const e=normalizeEvent('gift',{msgId:'x',user:{userId:'123',uniqueId:'viewer',nickname:'A',payGrade:{level:25},fansClub:{data:{level:7}}},gift:{giftId:'1',name:'Rose'},repeatCount:3});
  assert.equal(e.gifterLevel,25);assert.equal(e.fanLevel,7);assert.equal(e.giftCount,3);
});
test('anonymous accounts never produce a contactable identity or hidden account ID in evidence',()=>{
  const e=normalizeEvent('gift',{signature:'secret',user:{id:'123',secUid:'hidden',displayId:'enigma',enigmaInfo:{isEnigmaMaskOn:true}},giftId:'1'});
  assert.equal(e.userKey,null);assert.equal(e.userId,null);assert.equal(e.handle,null);
  assert.ok(!e.raw.includes('secret'));
  assert.ok(!e.raw.includes('hidden'));assert.ok(!e.raw.includes('123'));
});
test('actual installed protobuf binary decodes into supported field shapes',()=>{
  const user=User.decode(new Uint8Array());user.id='7654321098765432101';user.displayId='real_shape';user.nickname='Schema';
  const badge=BadgeStruct.decode(new Uint8Array());badge.priorityType=20;badge.sceneType=8;
  badge.privilegeLogExtra=PrivilegeLogExtra.decode(new Uint8Array());badge.privilegeLogExtra.level='37';user.badgeList=[badge];
  const message=WebcastChatMessage.decode(new Uint8Array());message.user=user;message.content='binary round trip';
  const decoded=WebcastChatMessage.decode(WebcastChatMessage.encode(message).finish());
  const event=normalizeEvent('chat',decoded);assert.equal(event.gifterLevel,37);assert.equal(event.handle,'real_shape');assert.equal(event.userId,user.id);
});
test('host parsing rejects arbitrary websites, short links and malformed accounts',()=>{
  assert.equal(parseHost('https://www.tiktok.com/@Creator_1/live?x=1'),'creator_1');assert.equal(parseHost('@Creator.1'),'creator.1');
  for(const h of ['https://evil.example/@user/live','https://vm.tiktok.com/abc','a b','x','../abc'])assert.throws(()=>parseHost(h));
});
test('CSV formulas, quotes and newlines are safely encoded',()=>{
  assert.equal(csvCell('=HYPERLINK("x")'),'"\'=HYPERLINK(""x"")"');assert.equal(csvCell(' hello,"you"\nworld'),'" hello,""you""\nworld"');
  assert.equal(csvCell(' \t+1'),'"\' \t+1"');assert.equal(csvCell(null),'""');
});
