import test from 'node:test';
import assert from 'node:assert/strict';
import {raiseLadder,raisePresets,nearestStop,potRaiseTo,roundStep,stepStop} from '../public/raise-ladder.js';

const preflop={min:100,max:5000,sb:25,bb:50,pot:75,currentBet:50,toCall:50};

test('ladder starts at min, ends at all-in and is strictly increasing',()=>{
 const ladder=raiseLadder(preflop);
 assert.equal(ladder[0],100);assert.equal(ladder.at(-1),5000);
 for(let i=1;i<ladder.length;i++)assert.ok(ladder[i]>ladder[i-1]);
});

test('slider notches are one round step sized from the player chips',()=>{
 assert.deepEqual(raiseLadder(preflop).slice(0,4),[100,200,400,600]);
 assert.deepEqual(raiseLadder(preflop).slice(-3),[4600,4800,5000]);
 assert.deepEqual(raiseLadder({min:100,max:4975,sb:25}).slice(-2),[4800,4975]);
});

test('every stop between min and all-in is a round number',()=>{
 for(const opts of [preflop,{min:137,max:1913,sb:25},{min:2000,max:61337,sb:400},{min:50,max:740,sb:10}]){
  const inner=raiseLadder(opts).slice(1,-1),step=inner[1]-inner[0];
  assert.match(String(step),/^(1|2|25|5)0*$/,`step ${step} is not round`);
  for(const v of inner)assert.equal(v%step,0,`${v} is not a multiple of ${step}`);
 }
});

test('roughly thirty notches whatever the stack size',()=>{
 for(const max of [1200,5000,48000,250000]){const n=raiseLadder({min:100,max,sb:25}).length;assert.ok(n>=12&&n<=34,`${max}: ${n} stops`);}
});

test('a notch is never smaller than the small blind',()=>{
 assert.deepEqual(raiseLadder({min:100,max:120,sb:25}),[100,120]);
 assert.deepEqual(raiseLadder({min:150,max:640,sb:75}),[150,200,300,400,500,600,640]);
});

test('odd minimum and all-in are kept exactly as the rules require',()=>{
 const ladder=raiseLadder({min:137,max:1913,sb:25});
 assert.equal(ladder[0],137);assert.equal(ladder.at(-1),1913);
});

test('roundStep picks 1, 2, 2.5 or 5 times a power of ten',()=>{
 assert.equal(roundStep(162),200);assert.equal(roundStep(21),25);assert.equal(roundStep(1600),2000);assert.equal(roundStep(3),5);assert.equal(roundStep(0.4),1);
});

test('stepper moves to the next round stop even from an off-ladder preset',()=>{
 const ladder=[100,200,400,600,800];
 assert.equal(stepStop(ladder,150,1),200);assert.equal(stepStop(ladder,150,-1),100);
 assert.equal(stepStop(ladder,800,1),800);assert.equal(stepStop(ladder,100,-1),100);
});

test('pot raise follows call-then-raise-the-pot',()=>{
 assert.equal(potRaiseTo({pot:300,currentBet:100,toCall:100,fraction:1}),500);
});

test('presets are unique, inside the legal range and include min and all-in',()=>{
 const presets=raisePresets(preflop),values=presets.map(p=>p.value);
 assert.equal(new Set(values).size,values.length);
 assert.equal(presets[0].label,'Min');assert.equal(presets.at(-1).label,'All-in');
 for(const v of values)assert.ok(v>=100&&v<=5000);
 assert.ok(presets.some(p=>p.label==='3 BB'&&p.value===150));
});

test('nearestStop picks the closest ladder index',()=>{
 assert.equal(nearestStop([100,150,200,300],260),3);
 assert.equal(nearestStop([100,150,200,300],100),0);
});
