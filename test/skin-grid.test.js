import test from 'node:test';import assert from 'node:assert/strict';
import {createLazySkinArt} from '../public/skin-grid.js';
function setup(){const slots=Array.from({length:33},(_,i)=>({dataset:{skinArt:String(i)},childElementCount:0,classList:{toggle(){}},html:''}));for(const s of slots)Object.defineProperty(s,'innerHTML',{set(v){this.html=v;this.childElementCount=1;this.writes=(this.writes||0)+1;}});let cb,disconnected=false;const observed=new Set();class Observer{constructor(fn,o){cb=fn;assert.equal(o.rootMargin,'160px 0px')}observe(s){observed.add(s)}unobserve(s){observed.delete(s)}disconnect(){disconnected=true;observed.clear()}}
 const root={querySelectorAll:()=>slots,contains:s=>slots.includes(s)};return {root,slots,Observer,show:(s,on=true)=>cb([{target:s,isIntersecting:on}]),observed,get disconnected(){return disconnected}};}
test('shop hydrates only near-view artwork and retains it through selection and wallet refresh',()=>{
 const f=setup(),calls=[];const grid=createLazySkinArt(f.root,id=>{calls.push(id);return '<svg>'+id+'</svg>'},{Observer:f.Observer});grid.refresh();assert.equal(calls.length,0);assert.equal(f.observed.size,33);
 f.show(f.slots[0]);f.show(f.slots[1]);assert.deepEqual(calls,['0','1']);grid.refresh();f.show(f.slots[0],false);f.show(f.slots[0]);assert.equal(calls.length,2);assert.equal(f.slots[0].writes,1);grid.disconnect();assert.ok(f.disconnected);f.show(f.slots[2]);assert.equal(calls.length,2);
});
test('ownership change refreshes only affected art and survives grid reuse',()=>{
 const f=setup();let owned=false;const options={Observer:f.Observer,keyFor:id=>id==='0'&&!owned?'shadow':'full'},make=()=>createLazySkinArt(f.root,id=>id==='0'&&!owned?'shadow':'animated',options);
 let grid=make();grid.refresh();f.show(f.slots[0]);f.show(f.slots[1]);grid.disconnect();owned=true;grid=make();grid.refresh();assert.equal(f.slots[0].html,'animated');assert.equal(f.slots[0].writes,2);assert.equal(f.slots[1].writes,1);grid.disconnect();
});
test('missing IntersectionObserver falls back to complete usable artwork',()=>{const f=setup();const grid=createLazySkinArt(f.root,id=>id,{Observer:null});grid.refresh();assert.ok(f.slots.every(s=>s.childElementCount===1));grid.disconnect();});
