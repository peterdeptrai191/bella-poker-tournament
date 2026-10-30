import {CHARACTERS} from './characters.js';
// The GOAT or BOAT box (kept under the CR7 event id so first free spins and receipts carry over).
export const CR7_EVENT='cr7-boat-v1';
export const CR7_PRICE=17;
export const BOX_NAME='GOAT or BOAT';
// Each account may spin at most this many times a day (Vietnam time, server clock), the free spin included.
export const DAILY_SPINS=10;
const BOAT_ORDER=['cr7-mu','cr7-real','cr7-sporting','cr7-al-nassr'];
export const cr7Skins=()=>CHARACTERS.filter(c=>c.event===CR7_EVENT&&c.id.startsWith('cr7-')).sort((a,b)=>BOAT_ORDER.indexOf(a.id)-BOAT_ORDER.indexOf(b.id));
export const goatSkins=()=>CHARACTERS.filter(c=>c.event===CR7_EVENT&&c.id.startsWith('goat-'));
// On the board: skins worth 10 coin or more, plus the box-only GOAT/BOAT skins. The server first draws a
// colour group (red 10%, purple 40%, gold 50%), then a card inside it: inside red the two headline cards
// (M10 Barca, CR7 Real) are 2% each and the other two 3% each; purple and gold cards are equal inside their
// group. The rewards list shows exactly these numbers.
export const isCheap=c=>typeof c.price==='number'&&c.price<10;
export const SPARKLE=new Set(['goat-m10-barca-2015','cr7-real']);
const RED=['son-tung-mtp','goat-m10-barca-2015','cr7-real','sydney-sweeney'],RED_WEIGHT=[3,2,2,3];
const PURPLE=['goat-m10-bernabeu','cr7-mu','goat-m10-paris','cr7-sporting','goat-m10-miami','cr7-al-nassr','goat-neymar-samba'];
export const GROUP_ODDS={red:10,purple:40,gold:50};
const characterOf=id=>CHARACTERS.find(c=>c.id===id);
const onBoard=()=>CHARACTERS.filter(c=>c.event===CR7_EVENT||(typeof c.price==='number'&&c.price>=10)).map(c=>c.id);
export const goatFrame=c=>RED.includes(c.id)?'red':c.event===CR7_EVENT?'purple':'gold';
export function goatGroups(){
 const ids=onBoard(),purple=[...PURPLE.filter(id=>ids.includes(id)),...ids.filter(id=>!RED.includes(id)&&!PURPLE.includes(id)&&characterOf(id).event===CR7_EVENT)];
 return {red:RED.filter(id=>ids.includes(id)),purple,gold:ids.filter(id=>goatFrame(characterOf(id))==='gold')};
}
// Board order, clockwise after the badge in the top-left corner: the four red cards along the top, then gold
// and purple cards taking turns around the rest of the board.
export function goatTiles(){
 const g=goatGroups(),out=[...g.red],gold=[...g.gold],purple=[...g.purple];
 while(gold.length||purple.length){if(gold.length)out.push(gold.shift());if(purple.length)out.push(purple.shift());}
 return out;
}
// Chance of each card (0–1).
export function goatOdds(){
 const g=goatGroups(),odds={},redTotal=RED_WEIGHT.reduce((n,w,i)=>n+(g.red.includes(RED[i])?w:0),0);
 RED.forEach((id,i)=>{if(g.red.includes(id))odds[id]=GROUP_ODDS.red/100*RED_WEIGHT[i]/redTotal;});
 for(const id of g.purple)odds[id]=GROUP_ODDS.purple/100/g.purple.length;
 for(const id of g.gold)odds[id]=GROUP_ODDS.gold/100/g.gold.length;
 return odds;
}
// groupRoll: whole number 0–99; inner: any whole number ≥ 0 (the server uses crypto randomInt for both).
export function goatPick(groupRoll,inner){
 const g=goatGroups();
 if(groupRoll<GROUP_ODDS.red){const w=RED.map((id,i)=>g.red.includes(id)?RED_WEIGHT[i]:0),total=w.reduce((a,b)=>a+b,0);let r=inner%total;for(let i=0;i<RED.length;i++){if(r<w[i])return RED[i];r-=w[i];}}
 const pool=groupRoll<GROUP_ODDS.red+GROUP_ODDS.purple?g.purple:g.gold;return pool[inner%pool.length];
}
