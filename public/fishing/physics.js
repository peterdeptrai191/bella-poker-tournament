// Deterministic 100ms simulation. Server replays the same input transitions before awarding a fish.
import {GEAR} from './catalog.js';
export const DT=100;
export function setupFight(equipped,tier,seed,training=false){const index=k=>equipped[k]||0;return {tier:training?0:tier,seed,pull:GEAR.rod[index('rod')][3],speed:GEAR.reel[index('reel')][3],redLimit:GEAR.line[index('line')][3],slackLimit:GEAR.hook[index('hook')][3],training};}
export const initialFight=()=>({elapsed:0,tension:36,distance:8,red:0,slack:0,outcome:null});
export function stepFight(s,hold,c){if(s.outcome)return s;const t=(s.elapsed+DT)/1000,phase=(c.seed%1000)/1000*Math.PI*2;const burst=Math.max(0,Math.sin(t*(.65+c.tier*.11)+phase));const force=.22+c.tier*.12+burst*(.55+c.tier*.17);const control=1+c.pull/180;
 const tension=Math.max(0,Math.min(100,s.tension+(hold?(1.35+force)/control:-2.45+force*.15)));
 const delta=hold?-(.073*(1+c.pull/160)*(1+c.speed/170))/(1+c.tier*.16)+burst*.008:.016+burst*.009;
 const distance=Math.max(0,Math.min(11,s.distance+delta)),red=tension>=85?s.red+DT:Math.max(0,s.red-DT*.6),slack=tension<9?s.slack+DT:0,elapsed=s.elapsed+DT;
 const outcome=red>=c.redLimit?'broken':slack>=c.slackLimit?'slack':distance>=10.9?'escaped':distance<=0?'caught':elapsed>=90000?'timeout':null;return {elapsed,tension,distance,red,slack,outcome};}
export function replayFight(config,events,duration){let s=initialFight(),hold=false,i=0;for(let t=0;t<duration&&!s.outcome;t+=DT){while(i<events.length&&events[i][0]<=t){hold=events[i++][1];}s=stepFight(s,hold,config);}return s;}
