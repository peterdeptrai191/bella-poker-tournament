import {CHARACTERS} from './characters.js';
export const MASKED_PRICE=15;
export const MASKED_STARS=['dangrangto','jack97','mck','the-weeknd','son-tung-mtp'];
export function maskedGroups(){return [MASKED_STARS,CHARACTERS.filter(c=>!c.comingSoon&&!c.event&&!MASKED_STARS.includes(c.id)&&c.price>6&&c.price<=10).map(c=>c.id),CHARACTERS.filter(c=>!c.comingSoon&&!c.event&&c.price>0&&c.price<=6).map(c=>c.id)];}
export function maskedPick(roll,index){const group=roll<20?0:roll<50?1:2,pool=maskedGroups()[group];return {skin:pool[index%pool.length],group};}
