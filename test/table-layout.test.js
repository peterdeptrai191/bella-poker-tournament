import test from 'node:test';import assert from 'node:assert/strict';
import {circularSeats,turnFraction} from '../public/table-layout.js';
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
