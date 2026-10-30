import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHARACTERS} from '../public/characters.js';
import {animatedCharacter} from '../public/character-motion.js';
test('every skin has surrounding effects in its animated rendering',()=>{
 for(const c of CHARACTERS){const html=animatedCharacter(c);assert.match(html,/character-motion/,c.id);assert.match(html,/hero-effects|fire-orbit|cr7-ring|goat-/,c.id);}
});
test('shop renders live art and both pack opening sequences remain wired',()=>{
 const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
 assert.ok(!read('app.js').includes('characterThumbnail'));
 assert.match(read('cr7-event.js'),/await revealCard\(d,c/);
 assert.match(read('cr7-event.js'),/await openGift\(d,c/);
 assert.match(read('spin-wheel.css'),/animation:restored-card-glow/);
});
