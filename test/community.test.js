import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {service} from './account-fixture.js';
import {readRoom,writeRoom,clearMemory} from '../lib/store.js';
const call=(body,token,code)=>service({method:body?'POST':'GET',body:body?{...body,requestId:body.requestId||randomUUID()}:undefined,token,code,ip:'community'});
async function table(n=3){clearMemory();const host=await call({op:'create',name:'Host'}),code=host.room.code,users=[host];for(let i=1;i<n;i++)users.push(await call({op:'join',name:'Guest '+i,code}));for(const u of users)await call({op:'ready',ready:true,code},u.token);await call({op:'start',code},host.token);return {users,code};}

test('only eliminated viewers can see a selected live hand and every client sees who watches whom',async()=>{
 const {users,code}=await table(4),[out,target,other]=users;
 await assert.rejects(()=>call({op:'watch',playerId:target.room.me,code},out.token),/bị loại/);
 const {room,raw}=await readRoom(code),p=room.players.find(p=>p.id===out.room.me);p.rank=4;p.stack=0;delete room.hand.holes[p.id];room.hand.pending=room.hand.pending.filter(id=>id!==p.id);if(room.hand.turn===p.id)room.hand.turn=target.room.me;room.hand.deadline=Date.now()+60000;
 await writeRoom(code,raw,room);
 const watched=(await call({op:'watch',playerId:target.room.me,code},out.token)).room;
 assert.equal(watched.players.find(p=>p.id===target.room.me).hole.length,2);assert.equal(watched.players.find(p=>p.id===other.room.me).hole,null);
 const live=(await call(null,other.token,code)).room;
 assert.equal(live.players.find(p=>p.id===out.room.me).watchingId,target.room.me);assert.equal(live.players.filter(p=>p.hole).length,1);
 // locked for the rest of the hand: no switching, no clearing
 await assert.rejects(()=>call({op:'watch',playerId:other.room.me,code},out.token),/Mỗi ván chỉ được chọn 1 người/);
 await assert.rejects(()=>call({op:'watch',playerId:null,code},out.token),/Mỗi ván chỉ được chọn 1 người/);
 // a new hand frees the choice again
 {const {room,raw}=await readRoom(code);room.hand.id='next-hand';await writeRoom(code,raw,room);}
 assert.equal((await call({op:'watch',playerId:other.room.me,code},out.token)).room.players.find(p=>p.id===other.room.me).hole.length,2);
 {const {room,raw}=await readRoom(code);room.hand.id='third-hand';await writeRoom(code,raw,room);}
 await assert.rejects(()=>call({op:'watch',playerId:out.room.me,code},out.token),/không còn/);
});

test('folded cards can only be voluntarily shown by their owner after that hand ends',async()=>{
 const {users,code}=await table(),initial=(await call(null,users[0].token,code)).room,folder=users.find(u=>u.room.me===initial.hand.turn),other=users.find(u=>u!==folder);
 await call({op:'action',kind:'fold',handId:initial.hand.id,code},folder.token);
 await assert.rejects(()=>call({op:'showCards',handId:initial.hand.id,code},folder.token),/sau khi/);
 let state=(await call(null,other.token,code)).room;
 while(state.hand.stage!=='complete'){const actor=users.find(u=>u.room.me===state.hand.turn);state=(await call({op:'action',kind:'fold',handId:state.hand.id,code},actor.token)).room;}
 assert.equal((await call(null,other.token,code)).room.players.find(p=>p.id===folder.room.me).hole,null);
 await assert.rejects(()=>call({op:'showCards',handId:'stale',code},folder.token),/thay đổi/);
 await call({op:'showCards',handId:state.hand.id,code},folder.token);
 const shown=(await call(null,other.token,code)).room;assert.equal(shown.players.find(p=>p.id===folder.room.me).hole.length,2);assert.deepEqual(shown.hand.shownCards,[folder.room.me]);assert.ok(!JSON.stringify(shown).includes('tokenHash'));
});

test('everyone out picks a player again at the start of each hand',async()=>{
 const {startHand}=await import('../lib/poker.js');
 const {code}=await table(3);const {room}=await readRoom(code);const p=room.players[0];p.rank=3;p.stack=0;p.watchingId=room.players[1].id;p.watchHand=room.hand.id;
 startHand(room,Date.now());assert.equal(p.watchingId,null);assert.equal(p.watchHand,null);
});
