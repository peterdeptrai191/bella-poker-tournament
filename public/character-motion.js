import {cr7Character} from './cr7-motion.js';
import {goatCharacter} from './goat-motion.js';
import {heroCharacter} from './hero-motion.js';
// Eyelids are registered in the artwork's original pixel coordinates.
// Keeping the effects in the same SVG viewport preserves every existing seat box.
const motion = {
 'bella-mu': {width:600,skin:'#ffdf20',fire:'#ff6229',speed:5.3,eyes:'M229 213Q243 226 265 222Q263 248 247 254Q228 250 229 213Z M270 220Q288 210 310 178Q319 170 327 184Q342 205 337 225Q329 248 307 244Q284 242 270 220Z',lids:'M234 231Q246 241 260 232 M279 223Q308 239 333 218'},
 'bella-chelsea': {width:616,skin:'#80f5fe',fire:'#21caff',speed:5.9,eyes:'M216 209Q229 223 253 220Q254 242 236 251Q218 249 216 209Z M261 221Q282 211 301 179Q316 176 323 201Q329 223 314 240Q284 249 261 221Z',lids:'M221 228Q233 240 249 230 M270 224Q295 239 319 219'},
 'bella-lakers': {width:597,skin:'#ffe524',fire:'#b26aff',speed:5.6,eyes:'M215 215Q236 231 260 224Q259 250 238 259Q218 255 215 215Z M270 227Q294 214 316 183Q329 178 337 204Q346 229 332 245Q302 255 270 227Z',lids:'M222 234Q238 245 254 235 M281 229Q307 245 335 225'},
 'bella-portugal-7': {width:594,skin:'#ffde23',fire:'#ff5536',speed:5.1,eyes:'M228 191Q241 204 264 202Q264 225 247 233Q230 231 228 191Z M270 205Q294 190 309 163Q322 159 332 185Q340 208 328 222Q299 234 270 205Z',lids:'M234 211Q245 222 260 212 M280 207Q307 224 331 202'},
 // Its own victory pose (no eyelid overlay): sky-blue fire ring, sun rays, rising glitter and twinkling stars.
 'bella-m10': {width:455,skin:'#ffde23',fire:'#6cb4ee',speed:5.4,sparkle:true,glory:true,eyes:'',lids:''},
 'bella-tennis': {width:631,skin:'#ffe52c',fire:'#a6ee29',speed:6.2,eyes:'M244 236Q259 249 282 246Q281 270 265 280Q246 276 244 236Z M297 250Q323 235 339 204Q352 200 361 224Q368 249 354 265Q325 279 297 250Z',lids:'M251 256Q263 267 277 257 M307 251Q334 269 358 246'},
 // These smaller masks stay inside the glasses; their rims remain visible.
 'bella-tech': {width:624,skin:'#f4f6fb',fire:'#8bdbff',speed:6.6,eyes:'M231 261Q244 272 262 269Q261 287 247 293Q233 289 231 261Z M289 265Q306 252 317 236Q329 242 335 262Q334 280 317 282Q300 278 289 265Z',lids:'M237 278Q248 286 259 277 M297 265Q315 277 331 261'}
};
// Twinkling four-point stars around the character (M10). Each star fades in and out on its own beat.
// Positions are for a 594-wide artwork and scale to the actual width.
const STARS=[[95,140,44,0],[505,120,36,.6],[540,330,48,1.2],[60,360,34,1.8],[470,500,40,.9],[120,560,42,2.1],[330,60,30,1.5],[545,560,28,2.4],[200,300,26,.3]];
const star=(x,y,s,d,i)=>`<path class="bella-sparkle${i%3===1?' gold':''}" style="--d:${d}s" transform="translate(${x} ${y})" d="M0 ${-s}C${s*.12} ${-s*.12} ${s*.12} ${-s*.12} ${s} 0C${s*.12} ${s*.12} ${s*.12} ${s*.12} 0 ${s}C${-s*.12} ${s*.12} ${-s*.12} ${s*.12} ${-s} 0C${-s*.12} ${-s*.12} ${-s*.12} ${-s*.12} 0 ${-s}Z"/>`;
const sparkles=w=>{const k=w/594;return `<g class="bella-sparkles" aria-hidden="true">${STARS.map(([x,y,s,d],i)=>star(x*k,y,s,d,i)).join('')}</g>`;};
// Behind the character: a slowly turning sunburst and a soft pulsing glow (like the sun on Argentina's flag).
const glory=w=>{const cx=w/2,cy=300,rays=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,b=a+.13,L=440;return `<path class="${i%2?'ray-gold':'ray-sky'}" d="M${cx} ${cy}L${(cx+Math.cos(a)*L).toFixed(1)} ${(cy+Math.sin(a)*L).toFixed(1)}L${(cx+Math.cos(b)*L).toFixed(1)} ${(cy+Math.sin(b)*L).toFixed(1)}Z"/>`;}).join('');
 return `<g class="bella-glory" aria-hidden="true"><defs><radialGradient id="bella-glory-glow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".75"/><stop offset=".45" stop-color="#8fcaf5" stop-opacity=".35"/><stop offset="1" stop-color="#8fcaf5" stop-opacity="0"/></radialGradient><radialGradient id="bella-glory-fade"><stop offset=".15" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="bella-glory-mask-${w}"><circle cx="${cx}" cy="${cy}" r="320" fill="url(#bella-glory-fade)"/></mask></defs><circle class="bella-glow" cx="${cx}" cy="${cy}" r="300" fill="url(#bella-glory-glow)"/><g mask="url(#bella-glory-mask-${w})"><g class="bella-rays" style="transform-origin:${cx}px ${cy}px">${rays}</g></g></g>`;};
// In front: gold glitter rising past the character and fading out.
const GLITTER=[[.18,560,0],[.32,600,.7],[.5,580,1.4],[.66,610,.35],[.82,570,1.05],[.26,520,1.8],[.74,530,2.3],[.42,620,2.7],[.9,600,1.6],[.1,600,2.1]];
const glitter=w=>`<g class="bella-glitter" aria-hidden="true">${GLITTER.map(([x,y,d],i)=>`<circle cx="${(x*w).toFixed(1)}" cy="${y}" r="${i%3?5:7}" style="--d:${d}s"/>`).join('')}</g>`;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function animatedCharacter(character,cls='character-avatar'){
 if(character.id.startsWith('goat-'))return goatCharacter(character,cls);
 if(character.event==='cr7-boat-v1')return cr7Character(character,cls);
 const hero=heroCharacter(character,cls);if(hero)return hero;
 const m=motion[character.id];
 if(!m)return `<img class="${escape(cls)}" src="/assets/characters/${character.id}.webp" alt="Bella · ${escape(character.name)}" style="--character-color:${character.color}">`;
 const cx=m.width/2,cy=353,rx=m.width*.45,ry=218;
 const orbit=`M ${cx-rx} ${cy} a ${rx} ${ry} 0 1 1 ${rx*2} 0 a ${rx} ${ry} 0 1 1 ${-rx*2} 0`;
 const front=`M ${cx+rx} ${cy} a ${rx} ${ry} 0 0 1 ${-rx*2} 0`;
 const sparks=Array.from({length:5},(_,i)=>{
  const angle=i*Math.PI*2/5,x=cx+Math.cos(angle)*rx,y=cy+Math.sin(angle)*ry;
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${i*72})"><path d="M0 -21C10 -12 3 -7 10 0C18 13 3 23 -7 13C-18 4 -2 -5 0 -21Z" fill="${m.fire}"/><path d="M0 -6Q9 5 0 14Q-9 8 0 -6Z" fill="#fff0ad"/></g>`;
 }).join('');
 return `<svg class="${escape(cls)} character-motion" viewBox="-18 -18 ${m.width+36} 676" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bella · ${escape(character.name)}" style="--character-color:${character.color};--fire-color:${m.fire};--blink-period:${m.speed}s;--blink-offset:${-m.speed*.37}s">${m.glory?glory(m.width):''}<g class="fire-orbit-back" aria-hidden="true"><path class="fire-orbit-halo" d="${orbit}"/><path class="fire-orbit-trail" d="${orbit}" pathLength="100"/><g class="fire-embers" style="transform-origin:${cx}px ${cy}px">${sparks}</g></g><image href="/assets/characters/${character.id}.webp" width="${m.width}" height="640"/>${m.eyes?`<g class="bella-eyelids" aria-hidden="true"><path d="${m.eyes}" fill="${m.skin}"/><path d="${m.lids}" fill="none" stroke="#051638" stroke-width="6" stroke-linecap="round"/></g>`:''}<g class="fire-orbit-front" aria-hidden="true"><path class="fire-front-halo" d="${front}"/><path class="fire-front-trail" d="${front}" pathLength="50"/></g>${m.glory?glitter(m.width):''}${m.sparkle?sparkles(m.width):''}</svg>`;
}
