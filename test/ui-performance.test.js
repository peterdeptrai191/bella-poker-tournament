import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {CHARACTERS} from '../public/characters.js';
import {animatedCharacter} from '../public/character-motion.js';
import {characterThumbnail} from '../public/character-thumbnail.js';
import {createAnimationRegistry} from '../public/perf.js';
test('shop thumbnails retain every correct asset with less than a tenth of animated catalog DOM',()=>{
 const old=CHARACTERS.map(c=>animatedCharacter(c)).join(''),next=CHARACTERS.map(c=>characterThumbnail(c)).join(''),count=s=>(s.match(/<[a-z][^/!]/gi)||[]).length;
 assert.ok(count(next)<count(old)/10);assert.ok(!next.includes('character-motion'));
 for(const m of next.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g))assert.ok(existsSync(new URL('../public'+m[1],import.meta.url)),m[1]);
 assert.match(characterThumbnail(CHARACTERS.find(c=>c.id==='bella-iron')),/viewBox="380 0 668 736"/);
});
test('animation registry releases detached trees and does not re-observe retained nodes',()=>{
 const observed=new Set(),observer={observe:n=>observed.add(n),unobserve:n=>observed.delete(n)},registry=createAnimationRegistry(observer);
 const node=()=>({isConnected:true,matches:()=>true,querySelectorAll:()=>[]});
 const retained=node();registry.scan(retained);registry.scan(retained);assert.equal(registry.size,1);
 for(let i=0;i<100;i++){const removed=node();registry.scan(removed);removed.isConnected=false;registry.prune();}
 assert.equal(registry.size,1);assert.equal(observed.size,1);retained.isConnected=false;registry.prune();assert.equal(registry.size,0);assert.equal(observed.size,0);
});
test('dark card skins maintain readable face colors and Sam cannot override their tokens',()=>{
 const css=readFileSync(new URL('../public/card-skins.css',import.meta.url),'utf8'),sam=readFileSync(new URL('../public/sam/style.css',import.meta.url),'utf8');
 const lum=hex=>{const a=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
 for(const id of ['neon','ruby','gold','galaxy','jade']){const block=css.match(new RegExp('\\[data-card-skin="'+id+'"\\]\\{([^}]+)'))[1],token=name=>block.match(new RegExp('--deck-'+name+':(#[a-f0-9]{6})'))[1];for(const ink of ['ink','red'])assert.ok((lum(token(ink))+.05)/(lum(token('bg'))+.05)>=4.5,`${id} ${ink}`);}
 assert.ok(!/\.card\{[^}]*--deck-(?:ink|red):/.test(sam),'Card face must inherit skin ink tokens');
});
