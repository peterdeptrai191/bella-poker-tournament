// Full effects are a game preference, independent of the operating system's motion setting.
const read=()=>{try{return localStorage.getItem('bella.fullEffects')!=='false';}catch{return true;}};
let full=read();
export const effectsReduced=()=>!full;
export function setFullEffects(value){full=!!value;try{localStorage.setItem('bella.fullEffects',JSON.stringify(full));}catch{}sync();}
function sync(){if(typeof document!=='undefined')document.documentElement.dataset.effects=full?'full':'reduced';}
sync();
