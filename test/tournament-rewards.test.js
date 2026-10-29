import test from 'node:test';import assert from 'node:assert/strict';
import {tournamentReward,HUMAN_TOUR_REWARDS} from '../public/tournament-rewards.js';
test('reward table pays one per human in all-human rooms, keeps bot rooms at one, and rejects invalid room sizes',()=>{
 for(let n=2;n<=9;n++){
  const humans=Array.from({length:n},()=>({isBot:false}));assert.equal(tournamentReward(humans).amount,n);assert.equal(HUMAN_TOUR_REWARDS[n],n);
  assert.equal(tournamentReward([...humans.slice(1),{isBot:true}]).amount,1);
 }
 for(const n of [0,1,10])assert.equal(tournamentReward(Array.from({length:n},()=>({}))).amount,0);
});
