import test from 'node:test';import assert from 'node:assert/strict';
import {evaluate,evaluate5,calculatePots,startTournament,startHand,legalActions,act,publicRoom,tick,leaderboard} from '../lib/poker.js';
const cards=s=>s.split(' ').map(c=>({rank:'23456789TJQKA'.indexOf(c[0])+2,suit:c[1]}));
function fixture(n=3){return {code:'TEST23',title:'Test',ownerId:'p0',status:'waiting',version:1,config:{startingStack:1500,levelMinutes:3,maxPlayers:n,actionSeconds:25},players:Array.from({length:n},(_,i)=>({id:'p'+i,name:'Player '+i,tokenHash:'secret'+i,stack:0,ready:true,seat:i,rank:null})),receipts:[]};}
const total=r=>r.players.reduce((a,p)=>a+p.stack,0)+(r.hand?.stage!=='complete'?Object.values(r.hand?.contributions||{}).reduce((a,b)=>a+b,0):0);
const move=(r,id,kind,amount)=>act(r,id,{kind,amount,handId:r.hand.id});
test('hand ranking: wheel, straight flush, full house, kickers and best 5 of 7',()=>{
 assert.deepEqual(evaluate5(cards('As 2d 3h 4c 5s')),[4,5]);
 assert.deepEqual(evaluate(cards('As Ks Qs Js Ts 2h 3h')),[8,14]);
 assert.deepEqual(evaluate(cards('As Ah Ac Kd Kh Ks 2h')),[6,14,13]);
 assert.deepEqual(evaluate(cards('As Ah Kd Qc Js 3h 2c')),[1,14,13,12,11]);
 assert.deepEqual(evaluate(cards('Ac Kc 9c 7c 4c 3h 2s')),[5,14,13,9,7,4]);
});
test('side pots include folded contributions but exclude folded eligibility',()=>{
 assert.deepEqual(calculatePots({a:100,b:250,c:400},['b']).map(p=>[p.amount,p.eligible]),[[300,['a','c']],[300,['c']],[150,['c']]]);
});
test('heads-up: button posts small blind and acts first before flop, big blind first after flop',()=>{
 const r=fixture(2);startTournament(r);assert.equal(r.hand.turn,r.hand.sbId);assert.equal(r.players.find(p=>p.id===r.hand.sbId).seat,r.hand.buttonSeat);
 move(r,r.hand.turn,'call');move(r,r.hand.turn,'check');assert.equal(r.hand.stage,'flop');assert.equal(r.hand.turn,r.hand.bbId);assert.equal(total(r),3000);
});
test('only own hole cards are returned; deck/token hashes never leave server',()=>{
 const r=fixture();startTournament(r);const pub=publicRoom(r,'p0');assert.equal(pub.players.find(p=>p.id==='p0').hole.length,2);assert.equal(pub.players.find(p=>p.id==='p1').hole,null);const raw=JSON.stringify(pub);assert.ok(!raw.includes('tokenHash'));assert.ok(!raw.includes('secret'));assert.ok(!raw.includes('"deck"'));assert.ok(!raw.includes('"holes"'));
});
test('out-of-turn and stale hand actions are rejected',()=>{
 const r=fixture();startTournament(r);const turn=r.hand.turn;assert.throws(()=>move(r,r.players.find(p=>p.id!==turn).id,'fold'),/Chưa đến lượt/);assert.throws(()=>act(r,turn,{kind:'fold',handId:'stale'}),/đã thay đổi/);
});
test('short all-in does not reopen a prior caller; cumulative full raise does',()=>{
 const r=fixture(4);startTournament(r);const order=[...r.hand.pending];const a=order[0],b=order[1],c=order[2],d=order[3];
 move(r,a,'raise',200);move(r,b,'call');const pc=r.players.find(p=>p.id===c);pc.stack=250-(r.hand.bets[c]||0);move(r,c,'allin');move(r,d,'call');assert.equal(r.hand.turn,a);assert.equal(legalActions(r,a).canRaise,false);move(r,a,'call');assert.equal(r.hand.turn,b);assert.equal(legalActions(r,b).canRaise,false);
});
test('under-minimum raise rejected unless it is exactly all-in',()=>{
 const r=fixture();startTournament(r);assert.throws(()=>move(r,r.hand.turn,'raise',75),/tối thiểu/);move(r,r.hand.turn,'raise',100);assert.equal(r.hand.currentBet,100);
});
test('timeout checks when free, otherwise folds',()=>{
 const r=fixture(2);startTournament(r,1000);const before=r.hand.turn;tick(r,r.hand.deadline+1);assert.ok(r.hand.folded.includes(before));assert.equal(r.hand.stage,'complete');
 const q=fixture(2);startTournament(q);move(q,q.hand.turn,'call');const bb=q.hand.turn;tick(q,q.hand.deadline+1);assert.ok(!q.hand.folded.includes(bb));assert.equal(q.hand.stage,'flop');
});
test('all-ins run board to five cards and conserve chips',()=>{
 const r=fixture(3);startTournament(r);for(let i=0;i<4&&r.hand.stage!=='complete';i++)move(r,r.hand.turn,'allin');assert.equal(r.hand.stage,'complete');assert.equal(r.hand.board.length,5);assert.equal(total(r),4500);assert.ok(r.hand.showdown);
});
test('side pot payout, unmatched bet refund and simultaneous elimination ranking',()=>{
 const r=fixture(3);startTournament(r);const h=r.hand;h.board=cards('2s 3d 7h 9c Jc');h.holes={p0:cards('As Ah'),p1:cards('Ks Kh'),p2:cards('Qs Qh')};h.contributions={p0:100,p1:200,p2:300};h.bets={p0:100,p1:200,p2:300};h.currentBet=300;h.pending=['p2'];h.turn='p2';h.stage='river';h.folded=[];h.startStacks={p0:100,p1:200,p2:300};r.players.forEach(p=>p.stack=0);r.players.find(p=>p.id==='p2').stack=1;h.lastActed={};move(r,'p2','check');
 assert.deepEqual(r.players.sort((a,b)=>a.id.localeCompare(b.id)).map(p=>p.stack),[300,200,101]);assert.equal(total(r),601);
});
test('an all-in short big blind needs no meaningless extra call heads-up',()=>{
 const r=fixture(2);startTournament(r);r.status='running';r.players.forEach((p,i)=>{p.stack=i===0?10:200;p.rank=null;});r.lastBB=r.players[1].seat;startHand(r);assert.equal(r.hand.stage,'complete');assert.equal(total(r),210);
});
test('ties on live leaderboard share a position',()=>{const r=fixture();r.players.forEach(p=>p.stack=100);assert.deepEqual(leaderboard(r).map(p=>p.position),[1,1,1]);});
test('simultaneous equal-stack busts share the same finishing place',()=>{const r=fixture(3);startTournament(r);const h=r.hand;h.board=cards('2s 3d 7h 9c Jc');h.holes={p0:cards('As Ah'),p1:cards('Ks Kh'),p2:cards('Qs Qh')};h.contributions={p0:100,p1:100,p2:100};h.bets={p0:100,p1:100,p2:100};h.currentBet=100;h.pending=['p0'];h.turn='p0';h.stage='river';h.folded=[];h.startStacks={p0:101,p1:100,p2:100};r.players.forEach(p=>p.stack=p.id==='p0'?1:0);move(r,'p0','check');assert.equal(r.status,'finished');assert.equal(r.players.find(p=>p.id==='p0').rank,1);assert.equal(r.players.find(p=>p.id==='p1').rank,2);assert.equal(r.players.find(p=>p.id==='p2').rank,2);});
test('randomized tournament simulations preserve chips and terminate without stuck turns',()=>{
 for(let game=0;game<35;game++){const r=fixture(2+game%8);startTournament(r);const chips=r.players.length*1500;let steps=0;while(r.status==='running'&&steps++<20000){assert.equal(total(r),chips);if(r.hand.stage==='complete'){startHand(r,Date.now()+steps*3000);continue;}assert.ok(r.hand.turn);const legal=legalActions(r,r.hand.turn);const roll=Math.random();const kind=roll<.12?'fold':roll<.4&&(legal.canRaise||legal.maxRaiseTo<=r.hand.currentBet)?'allin':legal.canCheck?'check':'call';move(r,r.hand.turn,kind);}assert.equal(total(r),chips);assert.equal(r.status,'finished');assert.equal(r.players.filter(p=>p.rank===1).length,1);}
});
