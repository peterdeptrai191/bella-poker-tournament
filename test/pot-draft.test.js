import test from 'node:test';
import assert from 'node:assert/strict';
import {startTournament,act,draftRaise,livePots,publicRoom} from '../lib/poker.js';

function fixture(n=3){return {code:'POTS23',title:'Pots',ownerId:'p0',status:'waiting',version:1,config:{startingStack:1500,levelMinutes:5,maxPlayers:9,actionSeconds:25,peek:false},players:Array.from({length:n},(_,i)=>({id:'p'+i,name:'Player '+i,tokenHash:'secret'+i,stack:0,ready:true,seat:i,rank:null})),receipts:[]};}

test('one main pot while nobody is all-in',()=>{
 assert.deepEqual(livePots({a:50,b:100,c:100},[],[]),[{amount:250,eligible:['a','b','c']}]);
 assert.deepEqual(livePots({},[],[]),[]);
});

test('an all-in player caps the main pot and the rest becomes a side pot',()=>{
 const pots=livePots({a:300,b:1000,c:1000},[],['a']);
 assert.deepEqual(pots,[{amount:900,eligible:['a','b','c']},{amount:1400,eligible:['b','c']}]);
});

test('chips only the bettor can win stay in the last pot instead of a fake side pot',()=>{
 assert.deepEqual(livePots({a:300,b:1000},[],['a']),[{amount:1300,eligible:['a','b']}]);
});

test('folded chips stay in the pot but folded players are not eligible',()=>{
 const pots=livePots({a:200,b:600,c:600,d:100},['d'],['a']);
 assert.deepEqual(pots,[{amount:700,eligible:['a','b','c']},{amount:800,eligible:['b','c']}]);
});

test('the slider draft is shown to everyone, clamped, and cleared once the player acts',()=>{
 const r=fixture();startTournament(r,1000);const h=r.hand,pid=h.turn;
 draftRaise(r,pid,{handId:h.id,amount:400},1200);
 assert.deepEqual(publicRoom(r,'p0',1300).hand.draft,{playerId:pid,amount:400});
 draftRaise(r,pid,{handId:h.id,amount:999999},1300);assert.equal(r.hand.draft.amount,1500);
 draftRaise(r,pid,{handId:h.id,amount:null},1400);assert.equal(publicRoom(r,'p0',1400).hand.draft,null);
 draftRaise(r,pid,{handId:h.id,amount:300},1500);act(r,pid,{handId:h.id,kind:'call'},1600);
 assert.equal(publicRoom(r,'p0',1700).hand.draft,null);
});

test('only the player whose turn it is can draft a raise',()=>{
 const r=fixture();startTournament(r,1000);const h=r.hand,other=r.players.find(p=>p.id!==h.turn).id;
 assert.throws(()=>draftRaise(r,other,{handId:h.id,amount:400},1200),/Chưa đến lượt/);
 assert.throws(()=>draftRaise(r,h.turn,{handId:'old',amount:400},1200),/thay đổi/);
});

test('public hand carries live pots during play',()=>{
 const r=fixture();startTournament(r,1000);const pub=publicRoom(r,'p0',1100).hand;
 assert.equal(pub.livePots.length,1);assert.equal(pub.livePots[0].amount,pub.pot);
});
