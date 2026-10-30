import {CHARACTERS} from './characters.js';
// The GOAT or BOAT box (kept under the CR7 event id so first free spins and receipts carry over).
export const CR7_EVENT='cr7-boat-v1';
export const CR7_PRICE=20;
export const BOX_NAME='GOAT or BOAT';
export const cr7Skins=()=>CHARACTERS.filter(c=>c.event===CR7_EVENT&&c.id.startsWith('cr7-'));
export const goatSkins=()=>CHARACTERS.filter(c=>c.event===CR7_EVENT&&c.id.startsWith('goat-'));
// Only skins worth 10 coin or more, plus the box-only GOAT/BOAT skins, are on the board. One card each,
// every card equally likely.
export const isCheap=c=>typeof c.price==='number'&&c.price<10;
// Board order (clockwise): GOAT, BOAT and other skins take turns so look-alikes never sit side by side.
const ORDER=['goat-m10-barca-2015','cr7-mu','sydney-sweeney','goat-m10-bernabeu','cr7-real','son-tung-mtp','goat-m10-paris','cr7-sporting','bella-iron','goat-m10-miami','cr7-al-nassr','bella-spider','goat-neymar-samba','bella-portugal-7','bella-mu','bella-m10','bella-chelsea','bella-lakers','bella-tech'];
export function goatTiles(){
 const ids=CHARACTERS.filter(c=>c.event===CR7_EVENT||(typeof c.price==='number'&&c.price>=10)).map(c=>c.id),rank=id=>{const i=ORDER.indexOf(id);return i<0?ORDER.length:i;};
 return ids.sort((a,b)=>rank(a)-rank(b));
}
// Card frames on the board: purple for the four headline cards, red for the other M10 and CR7 cards, gold for the rest.
const PURPLE=new Set(['goat-m10-barca-2015','cr7-mu','son-tung-mtp','sydney-sweeney']);
export const goatFrame=c=>PURPLE.has(c.id)?'purple':/^(goat-m10|cr7-|bella-m10$|bella-portugal-7$)/.test(c.id)?'red':'gold';
export const tileChance=id=>{const t=goatTiles();return t.filter(x=>x===id).length/t.length;};
