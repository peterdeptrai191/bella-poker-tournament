import {CHARACTERS} from './characters.js';
// The GOAT or BOAT box (kept under the CR7 event id so first free spins and receipts carry over).
export const CR7_EVENT='cr7-boat-v1';
export const CR7_PRICE=17;
export const BOX_NAME='GOAT or BOAT';
const BOAT_ORDER=['cr7-mu','cr7-real','cr7-sporting','cr7-al-nassr'];
export const cr7Skins=()=>CHARACTERS.filter(c=>c.event===CR7_EVENT&&c.id.startsWith('cr7-')).sort((a,b)=>BOAT_ORDER.indexOf(a.id)-BOAT_ORDER.indexOf(b.id));
export const goatSkins=()=>CHARACTERS.filter(c=>c.event===CR7_EVENT&&c.id.startsWith('goat-'));
// Only skins worth 10 coin or more, plus the box-only GOAT/BOAT skins, are on the board. One card each,
// every card equally likely.
export const isCheap=c=>typeof c.price==='number'&&c.price<10;
// Card frames: red neon for the four headline cards (two of them sparkle), purple for the other GOAT/BOAT cards,
// gold for the shop skins.
export const SPARKLE=new Set(['goat-m10-barca-2015','cr7-real']);
const RED=['son-tung-mtp','goat-m10-barca-2015','cr7-real','sydney-sweeney'];
const PURPLE=['goat-m10-bernabeu','cr7-mu','goat-m10-paris','cr7-sporting','goat-m10-miami','cr7-al-nassr','goat-neymar-samba'];
export const goatFrame=c=>RED.includes(c.id)?'red':c.event===CR7_EVENT?'purple':'gold';
// Board order, clockwise after the badge in the top-left corner: the red cards along the top, then the purple
// ones down the right, then the gold ones along the bottom and up the left, so look-alike cards sit together.
export function goatTiles(){
 const ids=CHARACTERS.filter(c=>c.event===CR7_EVENT||(typeof c.price==='number'&&c.price>=10)).map(c=>c.id);
 const group=id=>RED.includes(id)?0:characterOf(id).event===CR7_EVENT?1:2,rank=id=>{const l=[...RED,...PURPLE],i=l.indexOf(id);return i<0?99:i;};
 return ids.sort((a,b)=>group(a)-group(b)||rank(a)-rank(b));
}
const characterOf=id=>CHARACTERS.find(c=>c.id===id);
export const tileChance=id=>{const t=goatTiles();return t.filter(x=>x===id).length/t.length;};
