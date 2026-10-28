import test from 'node:test';import assert from 'node:assert/strict';
import {diffTableEffects,displayedPot} from '../public/effects.js';
const snapshot=()=>({code:'ROOM23',status:'running',config:{startingStack:5000},hand:{id:'hand-1',board:[]},players:[{id:'a',name:'Alice',stack:5000,rank:null,lastAction:null},{id:'b',name:'Bob',stack:5000,rank:null,lastAction:null}]});
test('flop reveals in order once; turn and river animate only new cards',()=>{
 const before=snapshot(),after=structuredClone(before);after.hand.board=[1,2,3];
 const events=diffTableEffects(before,after);assert.deepEqual(events.map(e=>e.index),[0,1,2]);assert.deepEqual(events.map(e=>e.delay),[0,190,380]);
 assert.deepEqual(diffTableEffects(after,structuredClone(after)),[]);
 const turn=structuredClone(after);turn.hand.board.push(4);assert.deepEqual(diffTableEffects(after,turn).map(e=>e.index),[3]);
 assert.deepEqual(diffTableEffects(null,turn),[]);assert.deepEqual(diffTableEffects({...before,code:'OTHER'},turn),[]);
});
test('chip deduction uses actual action payment, including all-in won at showdown',()=>{
 const before=snapshot(),after=structuredClone(before);after.players[0].stack=4900;after.players[0].lastAction={at:1,kind:'raise',paid:100,total:100};
 assert.equal(diffTableEffects(before,after).find(e=>e.type==='chips').amount,100);assert.deepEqual(diffTableEffects(after,after),[]);
 const won=structuredClone(before);won.players[0].stack=10000;won.players[0].lastAction={at:2,kind:'raise',paid:5000,total:5000,allIn:true};assert.equal(diffTableEffects(before,won).find(e=>e.type==='chips').amount,5000);
});
test('blinds animate deductions when tournament starts or a new hand begins',()=>{
 const before=snapshot();before.status='waiting';before.hand=null;before.players.forEach(p=>p.stack=0);
 const after=snapshot();after.players[0].stack=4975;after.players[1].stack=4950;
 assert.deepEqual(diffTableEffects(before,after).filter(e=>e.type==='chips').map(e=>e.amount),[25,50]);
 const next=structuredClone(after);next.hand.id='hand-2';next.players[0].stack-=50;assert.equal(diffTableEffects(after,next).find(e=>e.type==='chips').amount,50);
});
test('only confirmed new elimination ranks notify; simultaneous busts are grouped',()=>{
 const before=snapshot(),allin=structuredClone(before);allin.players[0].stack=0;assert.ok(!diffTableEffects(before,allin).some(e=>e.type==='elimination'));
 const after=structuredClone(allin);after.players[0].rank=3;after.players[1].rank=2;
 const notice=diffTableEffects(allin,after).find(e=>e.type==='elimination');assert.deepEqual(notice.players.map(p=>[p.name,p.rank]),[['Alice',3],['Bob',2]]);
 assert.ok(!diffTableEffects(after,after).some(e=>e.type==='elimination'));
 const champion=structuredClone(before);champion.players[0].rank=1;assert.ok(!diffTableEffects(before,champion).some(e=>e.type==='elimination'));
});

test('pot notifications show each changed total and increment, but never repeat on polling',()=>{
 const before=snapshot();before.hand.pot=75;const after=structuredClone(before);after.hand.pot=200;
 const event=diffTableEffects(before,after).find(e=>e.type==='pot');
 assert.equal(event.amount,200);assert.equal(event.delta,125);assert.equal(event.newHand,false);
 assert.ok(!diffTableEffects(after,structuredClone(after)).some(e=>e.type==='pot'));
 const complete=structuredClone(after);complete.hand.stage='complete';complete.hand.pot=0;complete.hand.winners=[{amount:200}];
 assert.equal(displayedPot(complete),200);assert.ok(!diffTableEffects(after,complete).some(e=>e.type==='pot'));
 const next=structuredClone(after);next.hand.id='hand-2';next.hand.pot=75;
 const fresh=diffTableEffects(complete,next).find(e=>e.type==='pot');assert.equal(fresh.amount,75);assert.equal(fresh.delta,75);assert.equal(fresh.newHand,true);
 assert.deepEqual(diffTableEffects(null,next),[]);
});

test('a skipped snapshot can show card reveals, actual chip deductions, pot and elimination together',()=>{
 const before=snapshot();before.hand.pot=100;const after=structuredClone(before);after.hand.stage='complete';after.hand.board=[1,2,3,4,5];after.hand.winners=[{amount:10000}];after.hand.pot=0;
 after.players[0].lastAction={at:10,kind:'raise',paid:5000,total:5000};after.players[0].stack=10000;after.players[0].rank=1;
 after.players[1].lastAction={at:11,kind:'call',paid:5000,total:5000};after.players[1].stack=0;after.players[1].rank=2;
 const events=diffTableEffects(before,after);
 assert.equal(events.filter(e=>e.type==='board').length,5);assert.equal(events.filter(e=>e.type==='chips').length,2);
 assert.equal(events.find(e=>e.type==='pot').amount,10000);
 assert.deepEqual(events.find(e=>e.type==='elimination').players,[{id:'b',name:'Bob',rank:2}]);
 assert.deepEqual(diffTableEffects(after,structuredClone(after)),[]);
});
