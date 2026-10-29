// Raise sizing helpers: turn the legal raise range into a short ladder of round,
// blind-based amounts so players drag between sensible stops instead of typing chips.

const BB_STOPS=[2,2.5,3,3.5,4,5,6,7,8,9,10,12,15,18,20,25,30,35,40,50,60,70,80,90,100,120,150,200,250,300,400,500,600,800,1000];
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

// Ordered stops for the slider: min, round big-blind multiples, pot-sized presets, all-in.
export function raiseLadder(options){
 const {min,max,bb}=options,stops=new Set([min,max]);
 if(bb>0)for(const m of BB_STOPS){const v=m*bb;if(v>min&&v<max)stops.add(v);}
 for(const p of raisePresets(options))stops.add(p.value);
 const ladder=[...stops].filter(v=>inRange(v,min,max)).sort((a,b)=>a-b);
 return fillGaps(ladder,options);
}

// Between far-apart stops (e.g. 100 BB → 120 BB late in a tournament) add round
// in-between values so one notch never jumps more than ~25% of the bet.
function fillGaps(ladder,{sb,bb}){
 const unit=Math.max(1,bb||sb||1),out=[];
 for(let i=0;i<ladder.length;i++){
  out.push(ladder[i]);const next=ladder[i+1];if(next===undefined)continue;
  let v=ladder[i];
  while(next/v>1.25){const step=Math.max(unit,roundTo(v*0.2,unit));v=roundTo(v+step,unit);if(v>=next)break;out.push(v);}
 }
 return [...new Set(out)];
}

// Index of the ladder stop closest to a chip amount.
export function nearestStop(ladder,value){
 let best=0;for(let i=1;i<ladder.length;i++)if(Math.abs(ladder[i]-value)<Math.abs(ladder[best]-value))best=i;return best;
}
