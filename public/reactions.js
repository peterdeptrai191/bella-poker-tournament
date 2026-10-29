// Bella flame-head reactions players drop after peeking at their cards.
// Five moods, worst hand to best. Icons are inline SVG so they stay crisp at 24–48px.

export const MOODS=[
 {label:'Nản',color:'#8ec5ff'},
 {label:'Lo',color:'#ffe08a'},
 {label:'Bình tĩnh',color:'#e9f5ee'},
 {label:'Tự tin',color:'#ffb35c'},
 {label:'Cháy',color:'#ff7043'}
];
// How long a dropped mood stays on the seat after the peek window closes.
export const MOOD_LINGER_MS=3000;
// How long a reaction dropped during the match stays on the seat (matches REACTION_SHOW_MS on the server).
export const MOOD_SHOW_MS=3500;

const N='#1b2340';
const S=(w=3.5)=>`stroke="${N}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const line=(d,w=3.5)=>`<path d="${d}" fill="none" ${S(w)}/>`;
const tear=(x,y,s=1)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 0 Q-5 8 0 11 Q5 8 0 0Z" fill="#7ec8ff" ${S(1.6)}/>`;
const starPath=(cx,cy,R,r,n)=>{const p=[];for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,d=i%2?r:R;p.push((cx+d*Math.cos(a)).toFixed(1)+' '+(cy+d*Math.sin(a)).toFixed(1));}return 'M'+p.join('L')+'Z';};
const spark=(cx,cy,R)=>`<path d="${starPath(cx,cy,R,R*.32,4)}" fill="#ffd23f" ${S(1.6)}/>`;

// The head gradient lives in one shared, always-rendered <defs> so every icon can reference it.
function ensureDefs(){
 if(typeof document==='undefined'||document.getElementById('bella-mood-defs'))return;
 const holder=document.createElement('div');
 holder.innerHTML='<svg id="bella-mood-defs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true" focusable="false"><defs><linearGradient id="bella-mood-head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe15a"/><stop offset="1" stop-color="#ff9a1f"/></linearGradient></defs></svg>';
 document.body.prepend(holder.firstChild);
}

export function moodIcon(e){
 ensureDefs();
 const f=[.5,.62,.78,.92,1][e]??1,rot=[-16,9,0,0,0][e]??0;
 const flame=`<g transform="rotate(${rot} 50 46) translate(50 46) scale(${f}) translate(-50 -46)"><path d="M28 46 C20 32 32 26 33 12 C41 22 44 26 46 14 C50 24 56 18 58 6 C66 22 78 30 72 46Z" fill="#ff7a1a" ${S(3.2)}/><path d="M40 46 C36 38 42 34 44 26 C48 32 52 32 54 24 C58 34 62 38 60 46Z" fill="#ffc43a"/></g>`;
 const head=`<circle cx="50" cy="63" r="30" fill="url(#bella-mood-head)" ${S(3.5)}/><ellipse cx="36" cy="45" rx="7" ry="3.5" fill="#fff" opacity=".45" transform="rotate(-25 36 45)"/>`;
 const eye=(x,ry,px,py)=>`<ellipse cx="${x}" cy="60" rx="8" ry="${ry}" fill="#fff" ${S(2.6)}/><circle cx="${x+px}" cy="${60+py}" r="3.4" fill="${N}"/>`;
 const lid=x=>`<path d="M${x-8} 59 L${x+8} 59 A8 7 0 0 1 ${x-8} 59Z" fill="#fff" ${S(2.6)}/><circle cx="${x}" cy="62" r="3" fill="${N}"/>`;
 let face='';
 if(e===0)face=eye(40,6.5,0,2)+eye(60,6.5,0,2)+line('M31 52 L47 46')+line('M69 52 L53 46')+tear(33,68)+tear(67,68)+line('M39 82 Q50 72 61 82');
 if(e===1)face=eye(40,7,2.5,0)+eye(60,7,2.5,0)+line('M31 50 L47 47')+line('M69 50 L53 47')+line('M40 79 q5 -4 10 0 t10 0')+tear(79,44,1.1);
 if(e===2)face=lid(40)+lid(60)+line('M31 51 H47')+line('M53 51 H69')+line('M42 79 H58');
 if(e===3)face=eye(40,5,2,0)+eye(60,5,2,0)+line('M31 49 Q39 41 47 47')+line('M69 46 L53 50')+`<path d="M38 75 Q52 88 67 71 Q53 78 38 75Z" fill="#fff" ${S(3)}/>`+line('M50 79 V84',2.4);
 if(e===4)face=eye(40,9,0,0)+eye(60,9,0,0)+`<circle cx="42" cy="57" r="1.8" fill="#fff"/><circle cx="62" cy="57" r="1.8" fill="#fff"/>`+line('M30 47 Q39 38 47 45')+line('M53 45 Q61 38 70 47')+`<path d="M34 70 Q50 96 66 70Z" fill="${N}" ${S(3)}/><path d="M42 85 Q50 78 58 85 Q50 92 42 85Z" fill="#ff7a7a"/><path d="M36 70 Q50 77 64 70 L63 74 Q50 80 37 74Z" fill="#fff"/>`+spark(15,38,8)+spark(86,34,9);
 return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${flame}${head}${face}</svg>`;
}
