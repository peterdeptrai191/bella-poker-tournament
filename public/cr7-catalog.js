import {CHARACTERS} from './characters.js';
// The GOAT or BOAT box (kept under the CR7 event id so first free spins and receipts carry over).
export const CR7_EVENT='cr7-boat-v1';
export const CR7_PRICE=20;
export const BOX_NAME='GOAT or BOAT';
export const cr7Skins=()=>CHARACTERS.filter(c=>c.event===CR7_EVENT&&c.id.startsWith('cr7-'));
export const goatSkins=()=>CHARACTERS.filter(c=>c.event===CR7_EVENT&&c.id.startsWith('goat-'));
// Skins under 10 coin take two tiles on the wheel, every other skin one. Every tile is equally likely,
// so a cheap skin is twice as likely as a premium one. The free farmer is not in the box.
export const isCheap=c=>typeof c.price==='number'&&c.price<10;
export function goatTiles(){
 const pool=CHARACTERS.filter(c=>c.price!==0),cheap=pool.filter(isCheap).map(c=>c.id),premium=pool.filter(c=>!isCheap(c)).map(c=>c.id);
 const low=[...cheap,...cheap],T=low.length+premium.length,out=[];let p=0,l=0;
 // spread premium tiles evenly around the ring
 for(let i=0;i<T;i++){const takeP=Math.floor((i+1)*premium.length/T)>Math.floor(i*premium.length/T);out.push(takeP?premium[p++]:low[l++]);}
 return out;
}
export const tileChance=id=>{const t=goatTiles();return t.filter(x=>x===id).length/t.length;};
