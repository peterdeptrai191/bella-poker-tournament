import test from 'node:test';import assert from 'node:assert/strict';import {service} from '../lib/service.js';import {clearMemory} from '../lib/store.js';
import {randomUUID} from 'node:crypto';
const call=(body,token,code)=>service({method:body?'POST':'GET',body:body?{...body,requestId:body.requestId||randomUUID()}:undefined,token,code,ip:'integration'});
test('real multiplayer service lifecycle: concurrent join, authorization, ready/start, idempotency, private cards',async()=>{
 clearMemory();const host=await call({op:'create',name:'Host',title:'Integration test',startingStack:1500,maxPlayers:3,levelMinutes:3});const code=host.room.code;
 const [a,b]=await Promise.all([call({op:'join',name:'Alice',code}),call({op:'join',name:'Bob',code})]);assert.notEqual(a.room.me,b.room.me);
 const full=await call(null,host.token,code);assert.equal(full.room.players.length,3);assert.equal(full.room.config.maxPlayers,9);
 await assert.rejects(()=>call(null,'0'.repeat(64),code),/chưa tham gia/);
 await assert.rejects(()=>call({op:'start',code},host.token),/sẵn sàng/);
 await Promise.all([host,a,b].map(p=>call({op:'ready',ready:true,code},p.token)));
 await assert.rejects(()=>call({op:'start',code},a.token),/Chỉ chủ phòng/);
 const started=await call({op:'start',code},host.token);assert.equal(started.room.status,'running');
 await assert.rejects(()=>call({op:'join',name:'Late',code}),/Không nhận thêm/);
 const states=await Promise.all([host,a,b].map(p=>call(null,p.token,code)));
 for(const state of states){assert.equal(state.room.players.filter(p=>p.hole).length,1);assert.ok(state.room.players.find(p=>p.id===state.room.me).hole);}
 const actor=[host,a,b].find(p=>p.room.me===started.room.hand.turn),state=(await call(null,actor.token,code)).room;
 const action={op:'action',kind:state.legal.canCheck?'check':'call',handId:state.hand.id,requestId:randomUUID(),code};const once=await call(action,actor.token);const twice=await call(action,actor.token);assert.equal(twice.room.version,once.room.version);assert.equal(twice.room.hand.pot,once.room.hand.pot);
 const serialized=JSON.stringify(twice.room);assert.ok(!serialized.includes('tokenHash'));assert.ok(!serialized.includes('"deck"'));
});
test('automatic room count ignores requested capacity and atomically enforces nine seats',async()=>{clearMemory();const host=await call({op:'create',name:'Host',maxPlayers:2});assert.equal(host.room.config.maxPlayers,9);const attempts=await Promise.allSettled(Array.from({length:12},(_,i)=>call({op:'join',name:'Guest '+i,code:host.room.code})));assert.equal(attempts.filter(r=>r.status==='fulfilled').length,8);assert.equal((await call(null,host.token,host.room.code)).room.players.length,9);});
test('sensitive operations require player credentials, not just a room code',async()=>{clearMemory();const h=await call({op:'create',name:'Host'});await assert.rejects(()=>call({op:'ready',ready:true,code:h.room.code},undefined),/không hợp lệ/);});

test('character selection persists for all players without exposing private cards',async()=>{
 clearMemory();const h=await call({op:'create',name:'Host',character:'doctor',withBot:true});const code=h.room.code;
 const guest=await call({op:'join',name:'Guest',character:'dj',code});
 assert.equal(guest.room.players.find(p=>p.id===h.room.me).character,'doctor');
 assert.equal(guest.room.players.find(p=>p.id===guest.room.me).character,'dj');
 assert.ok(guest.room.players.find(p=>p.isBot).character);
 await assert.rejects(()=>call({op:'character',character:'invalid',code},h.token),/Nhân vật không hợp lệ/);
 await assert.rejects(()=>call({op:'character',character:'chef',code}),/không hợp lệ/);
 await Promise.all([h,guest].map(p=>call({op:'ready',ready:true,code},p.token)));
 const before=(await call({op:'start',code},h.token)).room;
 const change={op:'character',character:'gardener',code,requestId:randomUUID()};
 const changed=await call(change,guest.token);const repeated=await call(change,guest.token);
 assert.equal(changed.room.version,repeated.room.version);
 const updated=(await call(null,h.token,code)).room;
 assert.equal(updated.players.find(p=>p.id===guest.room.me).character,'gardener');
 assert.equal(updated.leaderboard.find(p=>p.id===guest.room.me).character,'gardener');
 assert.equal(updated.hand.id,before.hand.id);assert.equal(updated.hand.pot,before.hand.pot);
 assert.equal(updated.players.filter(p=>p.hole).length,1);
 await assert.rejects(()=>call({op:'create',name:'Bad',character:'<script>'}),/Nhân vật không hợp lệ/);
});
