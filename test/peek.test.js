import test from 'node:test';
import assert from 'node:assert/strict';
import {startTournament,act,react,tick,publicRoom,PEEK_SECONDS} from '../lib/poker.js';

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
 assert.throws(()=>react(r,'p0',{handId:r.hand.id,mood:4},1500),/hết thời gian/);
});

test('players react once the cards are dealt and others see the mood',()=>{
 const r=fixture();startTournament(r,1000);const h=r.hand;
 react(r,'p1',{handId:h.id,mood:4},3000);react(r,'p1',{handId:h.id,mood:0},3500);
 assert.deepEqual(publicRoom(r,'p2',3600).hand.moods,{p1:0});
 assert.equal(publicRoom(r,'p2',3600).hand.peekUntil,h.peekUntil);
});

test('reactions are rejected after the window, for a stale hand, or with a bad mood',()=>{
 const r=fixture();startTournament(r,1000);const h=r.hand;
 assert.throws(()=>react(r,'p0',{handId:h.id,mood:2},h.peekUntil+2000),/hết thời gian/);
 assert.throws(()=>react(r,'p0',{handId:'old',mood:2},2000),/thay đổi/);
 for(const mood of [-1,5,1.5,'x'])assert.throws(()=>react(r,'p0',{handId:h.id,mood},2000),/không hợp lệ/);
});

test('timeouts still fire, counted from the end of the peek window',()=>{
 const r=fixture({n:2});startTournament(r,1000);const before=r.hand.turn;
 assert.equal(tick(r,r.hand.peekUntil+24000),false);
 assert.equal(tick(r,r.hand.deadline+1),true);assert.ok(r.hand.folded.includes(before));
});
