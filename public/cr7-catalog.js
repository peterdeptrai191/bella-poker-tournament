import {CHARACTERS} from './characters.js';
export const CR7_EVENT='cr7-boat-v1';
export const CR7_PRICE=20;
export const cr7Skins=()=>CHARACTERS.filter(c=>c.event===CR7_EVENT);
export const cr7Common=()=>CHARACTERS.filter(c=>c.price===3&&!c.event);
// Integer ticket ranges: 30/100 special, then uniform selection within the group.
export function cr7Reward(roll,pick){const pool=roll<30?cr7Skins():cr7Common();return pool[pick%pool.length];}
