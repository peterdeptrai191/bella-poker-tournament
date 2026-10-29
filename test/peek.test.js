import test from 'node:test';
import assert from 'node:assert/strict';
import {startTournament,act,react,tick,publicRoom,PEEK_SECONDS,REACTION_COOLDOWN_MS} from '../lib/poker.js';

function fixture({n=3,peek=true,levelMinutes=5}={}){return {code:'PEEK23',title:'Peek',ownerId:'p0',status:'waiting',version:1,config:{startingStack:1500,levelMinutes,maxPlayers:9,actionSeconds:25,peek,...(peek?{peekSeconds:PEEK_SECONDS[levelMinutes]}:{})},players:Array.from({length:n},(_,i)=>({id:'p'+i,name:'Player '+i,tokenHash:'secret'+i,stack:0,ready:true,seat:i,rank:null})),receipts:[]};}

test('peek seconds follow the level speed',()=>{
 assert.deepEqual(PEEK_SECONDS,{3:5,5:8,10:10});
 for(const [minutes,seconds] of Object.entries(PEEK_SECONDS)){const r=fixture({levelMinutes:Number(minutes)});startTournament(r,1000);assert.equal(r.hand.peekUntil,1000+seconds*1000);}
});

test('the first turn clock starts only after the peek window',()=>{
 const r=fixture();startTournament(r,1000);const h=r.hand;
 assert.equal(h.deadline,h.peekUntil+25000);
 assert.throws(()=>act(r,h.turn,{handId:h.id,kind:'fold'},h.peekUntil-1),/nặn bài/);
 act(r,h.turn,{handId:h.id,kind:'fold'},h.peekUntil);assert.equal(r.hand.folded.length,1);
});

test('no peek window when the room has peeking turned off',()=>{
 const r=fixture({peek:false});startTournament(r,1000);assert.equal(r.hand.peekUntil,null);assert.equal(r.hand.deadline,1000+25000);
});

test('players react once the cards are dealt and others see the mood',()=>{
 const r=fixture();startTournament(r,1000);const h=r.hand;
 react(r,'p1',{handId:h.id,mood:4},3000);react(r,'p1',{handId:h.id,mood:0},3500);
 assert.deepEqual(publicRoom(r,'p2',3600).hand.moods,{p1:0});
 assert.equal(publicRoom(r,'p2',3600).hand.peekUntil,h.peekUntil);
});

test('reactions work any time in the match, show for a few seconds, and are rate limited outside the peek',()=>{
 const r=fixture();startTournament(r,1000);const h=r.hand,later=h.peekUntil+5000;
 react(r,'p1',{handId:h.id,mood:3},later);
 assert.deepEqual(publicRoom(r,'p2',later+1000).reactions,{p1:{mood:3,at:later}});
 assert.deepEqual(publicRoom(r,'p2',later+4000).reactions,{});
 assert.throws(()=>react(r,'p1',{handId:h.id,mood:1},later+500),/chậm lại/);
 react(r,'p1',{handId:h.id,mood:1},later+REACTION_COOLDOWN_MS);assert.equal(publicRoom(r,'p2',later+REACTION_COOLDOWN_MS).reactions.p1.mood,1);
 // a reaction after the peek does not change the peek-screen mood
 assert.equal(r.hand.moods.p1,undefined);
});

test('during the peek you can change your mood freely; bad moods and strangers are refused',()=>{
 const r=fixture();startTournament(r,1000);const h=r.hand;
 react(r,'p0',{handId:h.id,mood:4},2000);react(r,'p0',{handId:h.id,mood:0},2100);assert.equal(r.hand.moods.p0,0);
 for(const mood of [-1,5,1.5,'x'])assert.throws(()=>react(r,'p0',{handId:h.id,mood},2000),/không hợp lệ/);
 assert.throws(()=>react(r,'stranger',{handId:h.id,mood:1},2000),/không ở trong phòng/);
});

test('timeouts still fire, counted from the end of the peek window',()=>{
 const r=fixture({n:2});startTournament(r,1000);const before=r.hand.turn;
 assert.equal(tick(r,r.hand.peekUntil+24000),false);
 assert.equal(tick(r,r.hand.deadline+1),true);assert.ok(r.hand.folded.includes(before));
});
