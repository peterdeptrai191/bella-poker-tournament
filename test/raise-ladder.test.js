import test from 'node:test';
import assert from 'node:assert/strict';
import {raiseLadder,raisePresets,nearestStop,potRaiseTo} from '../public/raise-ladder.js';

const preflop={min:100,max:5000,sb:25,bb:50,pot:75,currentBet:50,toCall:50};

test('ladder starts at min, ends at all-in and is strictly increasing',()=>{
 const ladder=raiseLadder(preflop);
 assert.equal(ladder[0],100);assert.equal(ladder.at(-1),5000);
 for(let i=1;i<ladder.length;i++)assert.ok(ladder[i]>ladder[i-1]);
});

test('every stop between min and all-in is a multiple of the small blind',()=>{
 for(const v of raiseLadder(preflop).slice(1,-1))assert.equal(v%25,0,`${v} is not a multiple of SB`);
});

test('ladder includes familiar big-blind sizes',()=>{
 const ladder=raiseLadder(preflop);
 for(const v of [125,150,200,250,500,1000])assert.ok(ladder.includes(v),`missing ${v}`);
});

test('no notch jumps more than about 25% once past a few big blinds',()=>{
 const ladder=raiseLadder({min:2000,max:60000,sb:400,bb:800,pot:3000,currentBet:1000,toCall:1000});
 for(let i=1;i<ladder.length;i++)assert.ok(ladder[i]/ladder[i-1]<=1.5,`${ladder[i-1]} -> ${ladder[i]}`);
});

test('odd minimum and all-in are kept exactly as the rules require',()=>{
 const ladder=raiseLadder({min:137,max:1913,sb:25,bb:50,pot:300,currentBet:87,toCall:87});
 assert.equal(ladder[0],137);assert.equal(ladder.at(-1),1913);
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

test('short stack collapses to min and all-in only',()=>{
 const ladder=raiseLadder({min:100,max:120,sb:25,bb:50,pot:75,currentBet:50,toCall:50});
 assert.deepEqual(ladder,[100,120]);
});

test('nearestStop picks the closest ladder index',()=>{
 assert.equal(nearestStop([100,150,200,300],260),3);
 assert.equal(nearestStop([100,150,200,300],100),0);
});
