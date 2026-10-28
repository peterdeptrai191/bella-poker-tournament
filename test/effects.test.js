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

test('pot updates and new hands at unchanged blinds never create a notification',()=>{
 const before=snapshot();before.hand.pot=75;const after=structuredClone(before);after.hand.pot=200;
 assert.ok(!diffTableEffects(before,after).some(e=>e.type==='pot'||e.type==='blind'));
 const complete=structuredClone(after);complete.hand.stage='complete';complete.hand.pot=0;complete.hand.winners=[{amount:200}];
 assert.equal(displayedPot(complete),200);assert.ok(!diffTableEffects(after,complete).some(e=>e.type==='pot'||e.type==='blind'));
 const next=structuredClone(after);next.hand.id='hand-2';next.hand.pot=75;
 assert.ok(!diffTableEffects(complete,next).some(e=>e.type==='pot'||e.type==='blind'));
});

test('blind increase notifies once when new stakes actually apply, never on initial load or clock-only changes',()=>{
 const before=snapshot();before.hand.blinds={level:1,sb:25,bb:50};
 const clock=structuredClone(before);clock.blinds={level:2,sb:50,bb:100};
 assert.ok(!diffTableEffects(before,clock).some(e=>e.type==='blind'));
 const after=structuredClone(clock);after.hand.id='hand-2';after.hand.blinds={level:2,sb:50,bb:100};
 const events=diffTableEffects(clock,after).filter(e=>e.type==='blind');assert.equal(events.length,1);
 assert.deepEqual(events[0].from,{sb:25,bb:50});assert.deepEqual(events[0].to,{sb:50,bb:100});
 assert.ok(!diffTableEffects(after,structuredClone(after)).some(e=>e.type==='blind'));
 assert.deepEqual(diffTableEffects(null,after),[]);
 const waiting=structuredClone(before);waiting.status='waiting';waiting.hand=null;
 assert.ok(!diffTableEffects(waiting,after).some(e=>e.type==='blind'));
 const finished=structuredClone(after);finished.status='finished';
 assert.ok(!diffTableEffects(before,finished).some(e=>e.type==='blind'));
});

test('a skipped snapshot can show card reveals, actual chip deductions and elimination together',()=>{
 const before=snapshot();before.hand.pot=100;const after=structuredClone(before);after.hand.stage='complete';after.hand.board=[1,2,3,4,5];after.hand.winners=[{amount:10000}];after.hand.pot=0;
 after.players[0].lastAction={at:10,kind:'raise',paid:5000,total:5000};after.players[0].stack=10000;after.players[0].rank=1;
 after.players[1].lastAction={at:11,kind:'call',paid:5000,total:5000};after.players[1].stack=0;after.players[1].rank=2;
 const events=diffTableEffects(before,after);
 assert.equal(events.filter(e=>e.type==='board').length,5);assert.equal(events.filter(e=>e.type==='chips').length,2);
 assert.ok(!events.some(e=>e.type==='pot'));
 assert.deepEqual(events.find(e=>e.type==='elimination').players,[{id:'b',name:'Bob',rank:2}]);
 assert.deepEqual(diffTableEffects(after,structuredClone(after)),[]);
});
