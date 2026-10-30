import test from 'node:test';
import assert from 'node:assert/strict';
import {combination,beats,instant,start,act,tick,snapshot,cardId,moves} from '../lib/sam/engine.js';
import {samRequest} from '../lib/sam/service.js';
import {clearMemory,writeRecord,readRecord,adminAuditPage} from '../lib/store.js';
const c=(rank,suit='s')=>({rank,suit});
const p=(id,cards=[])=>({id,name:id,accountId:id,cards,ready:true,score:0});
const playing=(cardsA,cardsB)=>({status:'playing',players:[p('a',cardsA),p('b',cardsB)],turn:'a',deadline:Date.now()+25000,combo:null,pile:[],last:null,passed:[],events:[],now:Date.now()});
test('Sâm combinations ignore suits and reject duplicate-rank straights / 2 in straight',()=>{
 assert.equal(combination([c(7),c(7,'h')]).type,'Đôi');assert.equal(combination([c(12),c(13),c(14)]).type,'Sảnh');
 assert.equal(combination([c(14),c(2),c(3)]),null);assert.equal(combination([c(3),c(3,'h'),c(4)]),null);
 assert.equal(beats(combination([c(8,'c')]),combination([c(8,'s')])),false);assert.equal(beats(combination([c(2)]),combination([c(14)])),true);
});
test('four of a kind cuts a single 2, not a pair of 2s',()=>{const q=combination(['c','d','h','s'].map(s=>c(4,s)));assert.ok(beats(q,combination([c(2)])));assert.ok(!beats(q,combination([c(2),c(2,'h')])));});
test('instant wins detect five pairs and three triples',()=>{assert.equal(instant([3,4,6,8,10].flatMap(r=>[c(r),c(r,'h')])),'Năm đôi');assert.equal(instant([3,5,7].flatMap(r=>[c(r),c(r,'h'),c(r,'d')]).concat(c(9))),'Ba sám');});
test('deal 10 unique cards to each of 5 players and hide other hands',()=>{const r={players:Array.from({length:5},(_,i)=>p('p'+i))};start(r);assert.equal(new Set(r.players.flatMap(x=>x.cards.map(cardId))).size,50);const v=snapshot(r,'p0');if(r.status!=='finished'){assert.equal(v.players[0].cards.length,10);assert.equal(v.players[1].cards,undefined);}assert.equal(v.players[0].accountId,undefined);assert.equal(v.deck,undefined);});
test('passes lock out until new trick, last player regains lead',()=>{const r=playing([c(3),c(4)],[c(5),c(6)]);act(r,'a','play',['3s']);act(r,'b','pass');assert.equal(r.turn,'a');assert.equal(r.combo,null);assert.deepEqual(r.passed,[]);});
test('a previous passer cannot re-enter the same trick',()=>{const r=playing([c(3),c(8),c(11)],[c(4),c(9),c(12)]);r.players.push(p('c',[c(5),c(10),c(13)]));act(r,'a','play',['3s']);act(r,'b','pass');act(r,'c','play',['5s']);assert.equal(r.turn,'a');act(r,'a','play',['8s']);assert.equal(r.turn,'c');});
test('reject wrong turn, stolen cards, duplicate selection and finishing with 2',()=>{const r=playing([c(3),c(2)],[c(4)]);assert.throws(()=>act(r,'b','play',['4s']));assert.throws(()=>act(r,'a','play',['4s']));assert.throws(()=>act(r,'a','play',['3s','3s']));const q=playing([c(2)],[c(4)]);assert.throws(()=>act(q,'a','play',['2s']),/lá 2/);});
test('must play highest single before player with one card',()=>{const r=playing([c(3),c(9)],[c(5)]);assert.throws(()=>act(r,'a','play',['3s']),/lớn nhất/);act(r,'a','play',['9s']);assert.equal(r.players[0].cards.length,1);});
test('báo Sâm gives lead, a legal block wins and illegal block is rejected',()=>{const r=playing([c(3),c(6),c(9)],[c(4),c(7),c(10)]);r.status='declaring';r.declareUntil=Date.now()+8000;act(r,'a','declare');act(r,'a','play',['3s']);assert.throws(()=>act(r,'b','play',['7s','4s']));act(r,'b','play',['4s']);assert.equal(r.status,'finished');assert.equal(r.winner,'b');assert.equal(r.reason,'Bắt Sâm');});
test('automated games terminate and conserve score',()=>{for(let trial=0;trial<30;trial++){const r={players:Array.from({length:2+trial%4},(_,i)=>({...p('p'+i),bot:true}))};let now=Date.now();start(r,now);for(let i=0;i<500&&r.status!=='finished';i++){now+=26000;tick(r,now);}assert.equal(r.status,'finished');assert.equal(r.results.reduce((n,x)=>n+x.points,0),0);}});
test('bot moves use own cards, legal moves do not require opponent hand values',()=>{const r=playing([c(3),c(3,'h'),c(4)],[c(5),c(6)]);assert.ok(moves(r,r.players[0]).some(x=>x.length===2));});
test('Sâm service isolates rooms, authenticates membership, deduplicates and rewards once',async()=>{
 clearMemory();const identity={id:'user-a',key:'account:sam-test'};await writeRecord(identity.key,null,{id:identity.id,username:'Test',coins:0,ownedSkins:['farmer'],equippedSkin:'farmer',version:1});
 let {room:r}=await samRequest({identity,body:{op:'create'}});const code=r.code,call=(op,extra={})=>samRequest({identity,body:{op,code,requestId:'test-'+crypto.randomUUID(),...extra}});
 await assert.rejects(samRequest({identity:{id:'intruder',key:'missing'},body:{op:'state',code}}));
 const requestId='bot-duplicate-123';await call('addBot',{requestId});await call('addBot',{requestId});r=(await call('state')).room;assert.equal(r.players.length,2);assert.equal(r.players[1].cards,undefined);
 await assert.rejects(call('character',{character:'bella-iron'}));await call('ready');r=(await call('start')).room;assert.equal(r.players[0].cards.length,10);
 const stored=await readRecord('sam-room:'+code);stored.value.status='finished';stored.value.winner=stored.value.players[0].id;stored.value.reason='Test';await writeRecord('sam-room:'+code,stored.raw,stored.value);
 await Promise.all([call('state'),call('state'),call('state')]);assert.equal((await readRecord(identity.key)).value.coins,1);assert.equal((await adminAuditPage(identity.id)).events.length,1);
 assert.equal((await readRecord('sam-room:'+code)).value.reward.amount,1);assert.equal((await readRecord('sam-room:'+code)).value.players.length,2);
});
test('two accounts join the same room, only host starts and private hands remain isolated',async()=>{
 clearMemory();const a={id:'human-a',key:'account:sam-a'},b={id:'human-b',key:'account:sam-b'},outsider={id:'human-c',key:'account:sam-c'};
 for(const id of [a,b,outsider])await writeRecord(id.key,null,{id:id.id,username:id.id,coins:0,ownedSkins:['farmer'],equippedSkin:'farmer'});
 const {room}=await samRequest({identity:a,body:{op:'create'}}),code=room.code;
 const call=(identity,op,extra={})=>samRequest({identity,body:{op,code,requestId:crypto.randomUUID(),...extra}});
 await assert.rejects(call(outsider,'state'),/chưa tham gia/);await call(b,'join');await call(b,'join');assert.equal((await call(a,'state')).room.players.length,2);
 await assert.rejects(call(b,'start'),/chủ phòng/);await assert.rejects(call(a,'start'),/sẵn sàng/);await call(a,'ready');await call(b,'ready');await call(a,'start');
 const va=(await call(a,'state')).room,vb=(await call(b,'state')).room;
 if(va.status!=='finished'){assert.equal(va.players.find(x=>x.me).cards.length,10);assert.equal(va.players.find(x=>!x.me).cards,undefined);assert.equal(vb.players.find(x=>x.me).cards.length,10);assert.equal(vb.players.find(x=>!x.me).cards,undefined);}
 assert.equal(va.players.find(x=>x.me).name,'human-a');assert.equal(vb.players.find(x=>x.me).name,'human-b');
});
