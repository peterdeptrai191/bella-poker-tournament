import test from 'node:test';
import assert from 'node:assert/strict';
test('full effects stay enabled under OS reduced motion and can be disabled explicitly',async()=>{
 const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 globalThis.document={documentElement:{dataset:{}}};globalThis.matchMedia=()=>({matches:true});
 const {effectsReduced,setFullEffects}=await import('../public/visual-effects.js');
 assert.equal(effectsReduced(),false);assert.equal(document.documentElement.dataset.effects,'full');
 setFullEffects(false);assert.equal(effectsReduced(),true);assert.equal(data.get('bella.fullEffects'),'false');
 setFullEffects(true);assert.equal(document.documentElement.dataset.effects,'full');
 delete globalThis.localStorage;delete globalThis.document;delete globalThis.matchMedia;
});
