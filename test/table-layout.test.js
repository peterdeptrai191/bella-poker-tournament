import test from 'node:test';import assert from 'node:assert/strict';
import {circularSeats,turnFraction,seatMetrics,seatBox} from '../public/table-layout.js';
import {startTournament,publicRoom} from '../lib/poker.js';

test('every seat follows clockwise order from the local player for 2–9 players',()=>{
 for(let count=2;count<=9;count++){
  const players=Array.from({length:count},(_,seat)=>({id:'p'+seat,seat}));
  for(const me of players){
   const seats=circularSeats([...players].reverse(),me);
   assert.deepEqual(seats.map(p=>p.seat),Array.from({length:count-1},(_,i)=>(me.seat+i+1)%count));
   const angles=seats.map(p=>(Math.atan2(p.y-80,p.x-50)-Math.PI/2+2*Math.PI)%(2*Math.PI));
   for(let i=1;i<angles.length;i++)assert.ok(angles[i]>angles[i-1],`Visual order must follow play order at ${count} seats`);
  }
 }
});

test('dealer, small blind, big blind and next actor occupy consecutive visual seats',()=>{
 for(let count=2;count<=9;count++){
  const room={status:'waiting',config:{startingStack:5000,levelMinutes:3,actionSeconds:25},players:Array.from({length:count},(_,seat)=>({id:'p'+seat,name:'Player '+seat,seat,stack:0,ready:true,rank:null}))};
  startTournament(room,1000);
  for(const me of room.players){
   const snapshot=publicRoom(room,me.id,1000),ring=[me,...circularSeats(snapshot.players,me)],index=id=>ring.findIndex(p=>p.id===id);
   assert.equal((index(snapshot.hand.bbId)-index(snapshot.hand.sbId)+count)%count,1);
   if(count>2)assert.equal((index(snapshot.hand.turn)-index(snapshot.hand.bbId)+count)%count,1);
  }
 }
});

test('gold perimeter counts down smoothly from the server deadline and resets for the next actor',()=>{
 const room={status:'running',config:{actionSeconds:25},hand:{stage:'flop',turn:'a',deadline:26000}};
 assert.equal(turnFraction(room,1000),1);assert.equal(turnFraction(room,13500),.5);assert.equal(turnFraction(room,26000),0);assert.equal(turnFraction(room,30000),0);
 room.hand.turn='b';room.hand.deadline=51000;assert.equal(turnFraction(room,26000),1);
 room.hand.stage='complete';assert.equal(turnFraction(room,27000),0);
});

test('all 2–9 player layouts have disjoint cells and leave HUD, board and local player clear',()=>{
 const overlaps=(a,b)=>a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top;
 for(const width of [305,320,360,375,390,430,520])for(const viewport of [568,640,667,700,740,844,932])for(let count=2;count<=9;count++){
  const height=Math.max(viewport,viewport<=740?620:670),short=viewport<=740,dock=short?153:166,hero=short?105:114;
  const cardWidth=Math.min(34,Math.max(23,width*.08)),cardHeight=Math.round(cardWidth*1.44),boardWidth=cardWidth*5+12;
  const board={left:(width-boardWidth)/2,top:height-dock-hero-8-28-cardHeight,width:boardWidth,height:cardHeight};
  const top=(short?166:191)+12,bottom=height-dock-8-6;
  const players=Array.from({length:count},(_,seat)=>({id:'p'+seat,seat})),seats=circularSeats(players,players[0]);
  const metrics=seatMetrics({width,top,bottom,boardTop:board.top,boardLeft:board.left,boardRight:board.left+board.width,opponents:count-1});
  assert.ok(metrics.cellHeight>=66,`Readable seat height at ${width}x${viewport}, ${count} players`);
  assert.ok(metrics.railWidth>=50);
  const boxes=seats.map(s=>seatBox(s,metrics,width));
  for(let i=0;i<boxes.length;i++){
   const a=boxes[i];assert.ok(a.top>=top-.01);assert.ok(a.top+a.height<=bottom+.01);assert.ok(a.left>=0&&a.left+a.width<=width);
   assert.ok(!overlaps(a,board),`Board collision at ${width}x${viewport}, ${count} players`);
   for(let j=i+1;j<boxes.length;j++)assert.ok(!overlaps(a,boxes[j]),`Seat collision at ${width}x${viewport}, ${count} players`);
  }
 }
});
