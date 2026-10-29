const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const HERO_EFFECTS=new Set(['missiles','shield','web','hearts','electric']);
const arcPaths=[
 'M149 114 116 159 139 177 86 229 112 247 57 313 88 341 58 395 104 426 83 486 129 540',
 'M483 98 511 150 486 173 550 218 524 248 589 298 555 327 596 377 548 412 571 469 521 514',
 'M147 596 192 564 215 592 262 560 290 601 335 577 365 612 407 576 444 600 488 558'
];
function lightning(paths,front=false){return paths.map((d,i)=>`<g class="arc-bolt arc-bolt-${i}" style="--arc-delay:${-i*1.1-(front?1.4:0)}s"><path class="arc-bolt-halo" d="${d}"/><path class="arc-bolt-core" d="${d}" pathLength="100"/></g>`).join('');}
function electricEffects(front=false){
 if(front)return `<g class="hero-effects arc-foreground" aria-hidden="true">${lightning(['M146 300 111 279 128 252 79 222 91 184 63 157','M347 410 393 428 412 405 454 440 480 419 535 461 562 449'],true)}<g class="arc-reactor" transform="translate(347 410)"><circle class="arc-core-ring" r="30"/><circle class="arc-core-pulse" r="23"/><circle class="arc-core-dot" r="5"/><g class="arc-core-orbit"><path d="M-38-9V-21H-26M26 21H38V9M-5-42H5M-5 42H5"/></g></g><g transform="translate(146 300)"><circle class="arc-palm-glow" r="26"/><circle class="arc-palm-ring" r="32"/></g>${[[69,174],[575,290],[116,548],[520,562],[470,88]].map(([x,y],i)=>`<g transform="translate(${x} ${y})"><path class="arc-spark" style="--arc-delay:${-i*.8}s" d="M0-7V7M-7 0H7"/><circle class="arc-particle" style="--arc-delay:${-i*.8}s" r="2.5"/></g>`).join('')}</g>`;
 return `<g class="hero-effects arc-effects" aria-hidden="true"><ellipse class="arc-aura" cx="320" cy="340" rx="220" ry="263"/><g class="arc-hud"><ellipse class="arc-hud-outer" cx="320" cy="338" rx="267" ry="286"/><ellipse class="arc-hud-inner" cx="320" cy="338" rx="245" ry="266"/>${Array.from({length:12},(_,i)=>`<g transform="translate(320 338) rotate(${i*30})"><path class="arc-hud-tick" d="M-7-276H7M0-287V-269"/></g>`).join('')}</g><path class="arc-trace" d="M77 265H109L133 242M531 249H562V290M98 480H126L142 460M500 506H539V478"/>${lightning(arcPaths)}<g class="arc-satellites" transform="translate(320 338)"><g class="arc-satellite-orbit"><path d="M0-280 7-268 0-256-7-268Z"/></g><g class="arc-satellite-orbit arc-satellite-second"><path d="M0-280 7-268 0-256-7-268Z"/></g></g></g>`;
}
const heart=`<path d="M0 15C-34-6-22-29-7-20L0-13 7-20C22-29 34-6 0 15Z" fill="currentColor" stroke="#ffe8f3" stroke-width="1.5"/><path d="M-17-10Q-20-19-11-18" fill="none" stroke="#fff7fb" stroke-width="3" stroke-linecap="round"/>`;
function heartOrbit(index,front=false){return `<g transform="translate(320 338)"><g class="love-orbit" style="--love-speed:${front?9:12}s;--love-delay:${-index*(front?4.5:3)}s"><g transform="translate(0 -${front?246:263})"><g class="love-upright"><g transform="scale(${front?0.72:0.9})">${heart}</g></g></g></g></g>`;}
function heartEffects(front=false){
 if(front)return `<g class="hero-effects heart-foreground" aria-hidden="true">${[0,1].map(i=>heartOrbit(i,true)).join('')}${[[74,527],[552,550],[110,360],[536,260]].map(([x,y],i)=>`<g transform="translate(${x} ${y})"><g class="love-float" style="--love-delay:${-i*1.3}s"><g transform="scale(.4)">${heart}</g></g></g>`).join('')}</g>`;
 return `<g class="hero-effects heart-effects" aria-hidden="true"><ellipse class="love-aura" cx="320" cy="338" rx="225" ry="265" fill="#ff83bb"/><ellipse class="love-ribbon" cx="320" cy="338" rx="246" ry="280"/><ellipse class="love-ribbon love-ribbon-inner" cx="320" cy="338" rx="230" ry="262"/>${[0,1,2,3].map(i=>heartOrbit(i)).join('')}${[[68,210],[565,365],[140,100],[500,92],[92,585],[528,595]].map(([x,y],i)=>`<g transform="translate(${x} ${y})"><path class="love-sparkle" style="--love-delay:${-i*.7}s" d="M0-11 3-3 11 0 3 3 0 11-3 3-11 0-3-3Z"/></g>`).join('')}</g>`;
}
const rocket=`<path d="M-21-10H14L32 0 14 10H-21Z" fill="#e4edf2" stroke="#25364b" stroke-width="3"/><path d="M13-10L32 0 13 10Z" fill="#d62d38"/><path d="M-17-10L-25-21-6-10M-17 10L-25 21-6 10" fill="#d62d38" stroke="#25364b" stroke-width="2"/><path class="rocket-plume" d="M-23-7Q-52-19-67 0Q-47 17-23 7Z" fill="#ff9437"/><path d="M-23-4Q-42-8-50 0Q-38 8-23 4Z" fill="#fff0a5"/>`;
const shield=`<circle r="43" fill="#c92b3d" stroke="#182a40" stroke-width="4"/><circle r="33" fill="#e9f0f3"/><circle r="24" fill="#c92b3d"/><circle r="16" fill="#246aab"/><path d="M0-14 12-7 12 7 0 14-12 7-12-7Z" fill="#fff"/>`;

export function heroEffects(type){
 if(type==='electric')return electricEffects();
 if(type==='hearts')return heartEffects();
 if(type==='missiles')return `<g class="hero-effects" aria-hidden="true"><circle class="missile-trail" cx="320" cy="338" r="260"/><g transform="translate(320 338)"><g class="hero-orbiter"><g transform="translate(0 -260)">${rocket}</g></g><g class="hero-orbiter orbit-second"><g transform="translate(0 -260)">${rocket}</g></g></g></g>`;
 if(type==='shield')return `<g class="hero-effects" aria-hidden="true"><circle class="shield-trail" cx="320" cy="338" r="260"/><g transform="translate(320 338)"><g class="hero-orbiter shield-orbit"><g transform="translate(0 -260)"><g class="hero-shield-spin">${shield}</g></g></g></g></g>`;
 if(type==='web')return `<g class="hero-effects web-effects" aria-hidden="true"><path class="web-shot" d="M185 300Q30 190 55 100M185 300Q40 450 100 595M185 300Q430 350 585 135"/><g class="web-orbit"><path d="M64 175Q320 12 576 175M64 175Q3 355 110 540M576 175Q637 355 530 540"/><path d="M64 175 110 215 155 177 200 198 248 158 320 178 390 158 440 198 485 177 530 215 576 175"/></g><g class="web-burst" transform="translate(585 135)"><path d="M-25 0H25M0-25V25M-18-18 18 18M18-18-18 18"/><circle r="13"/></g></g>`;
 return '';
}

// Catalog-owned artwork is rendered as supplied; effects stay in the avatar box.
export function heroCharacter(character,cls){
 if(!HERO_EFFECTS.has(character.effect))return null;
 const asset=`/assets/characters/${escape(character.asset||character.id+'.webp')}`;
 const artwork=character.artBox?`<svg x="90" y="25" width="460" height="626" viewBox="${escape(character.artBox)}" preserveAspectRatio="xMidYMid meet"><image href="${asset}" width="${character.artWidth}" height="${character.artHeight}"/></svg>`:`<image href="${asset}" x="90" y="25" width="460" height="626" preserveAspectRatio="xMidYMid meet"/>`;
 return `<svg class="${escape(cls)} character-motion hero-motion hero-${character.effect}" viewBox="0 0 640 676" role="img" aria-label="${escape(character.name)}" style="--character-color:${character.color}">${heroEffects(character.effect)}${artwork}${character.effect==='hearts'?heartEffects(true):character.effect==='electric'?electricEffects(true):''}</svg>`;
}
