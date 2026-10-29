// Raise sizing helpers. Quick-pick buttons offer familiar sizes (blinds, pot fractions);
// the slider moves in round chip notches sized from the player's own stack, so players
// never have to type or land on odd amounts.

const SLIDER_NOTCHES=30;
const POT_FRACTIONS=[{fraction:1/3,label:'⅓ Pot'},{fraction:1/2,label:'½ Pot'},{fraction:3/4,label:'¾ Pot'},{fraction:1,label:'Pot'}];

const roundTo=(value,unit)=>Math.round(value/unit)*unit;

// Raise-to amount for a pot-sized fraction: call first, then raise by that share of the pot after the call.
export function potRaiseTo({pot,currentBet,toCall,fraction}){return currentBet+fraction*(pot+toCall);}

function inRange(value,min,max){return Number.isSafeInteger(value)&&value>=min&&value<=max;}

// Quick-pick buttons. Every value is a multiple of the small blind, except the minimum and all-in.
export function raisePresets({min,max,sb,bb,pot=0,currentBet=0,toCall=0}){
 const unit=Math.max(1,sb||1),seen=new Set(),out=[];
 const add=(label,value,kind)=>{if(!inRange(value,min,max)||seen.has(value))return;seen.add(value);out.push({label,value,kind});};
 add('Min',min,'min');
 if(currentBet<=bb){add('2.5 BB',roundTo(2.5*bb,unit),'bb');add('3 BB',roundTo(3*bb,unit),'bb');}
 for(const {fraction,label} of POT_FRACTIONS)if(pot>0)add(label,roundTo(potRaiseTo({pot,currentBet,toCall,fraction}),unit),'pot');
 add('All-in',max,'allin');
 return out;
}

// Smallest "round" step (1, 2, 2.5 or 5 × 10^k, whole chips only) that is at least `raw`.
export function roundStep(raw){
 if(!(raw>1))return 1;
 for(let k=Math.floor(Math.log10(raw))-1;;k++){const base=10**k;for(const m of [1,2,2.5,5]){const step=m*base;if(Number.isInteger(step)&&step>=raw)return step;}}
}

// Slider stops: the legal minimum, every multiple of one round step in between, then all-in.
// The step is sized from the player's own chips (max = everything they can put in), so a
// deep stack moves in bigger round notches and a short stack in smaller ones.
// A notch is never smaller than the small blind, so short stacks don't get 1-chip steps.
export function raiseLadder({min,max,sb=1,notches=SLIDER_NOTCHES}){
 if(!(max>min))return [min];
 const step=roundStep(Math.max((max-min)/notches,sb)),stops=[min];
 for(let v=Math.floor(min/step)*step+step;v<max;v+=step)stops.push(v);
 stops.push(max);
 return stops;
}

// Next stop above (direction 1) or below (direction -1) a chip amount, for the -/+ buttons.
export function stepStop(ladder,value,direction){
 if(direction>0)return ladder.find(v=>v>value)??ladder.at(-1);
 for(let i=ladder.length-1;i>=0;i--)if(ladder[i]<value)return ladder[i];
 return ladder[0];
}

// Index of the ladder stop closest to a chip amount.
export function nearestStop(ladder,value){
 let best=0;for(let i=1;i<ladder.length;i++)if(Math.abs(ladder[i]-value)<Math.abs(ladder[best]-value))best=i;return best;
}
