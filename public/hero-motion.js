const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const HERO_EFFECTS=new Set(['missiles','shield','web']);
const rocket=`<path d="M-21-10H14L32 0 14 10H-21Z" fill="#e4edf2" stroke="#25364b" stroke-width="3"/><path d="M13-10L32 0 13 10Z" fill="#d62d38"/><path d="M-17-10L-25-21-6-10M-17 10L-25 21-6 10" fill="#d62d38" stroke="#25364b" stroke-width="2"/><path class="rocket-plume" d="M-23-7Q-52-19-67 0Q-47 17-23 7Z" fill="#ff9437"/><path d="M-23-4Q-42-8-50 0Q-38 8-23 4Z" fill="#fff0a5"/>`;
const shield=`<circle r="43" fill="#c92b3d" stroke="#182a40" stroke-width="4"/><circle r="33" fill="#e9f0f3"/><circle r="24" fill="#c92b3d"/><circle r="16" fill="#246aab"/><path d="M0-14 12-7 12 7 0 14-12 7-12-7Z" fill="#fff"/>`;

export function heroEffects(type){
 if(type==='missiles')return `<g class="hero-effects" aria-hidden="true"><circle class="missile-trail" cx="320" cy="338" r="260"/><g transform="translate(320 338)"><g class="hero-orbiter"><g transform="translate(0 -260)">${rocket}</g></g><g class="hero-orbiter orbit-second"><g transform="translate(0 -260)">${rocket}</g></g></g></g>`;
 if(type==='shield')return `<g class="hero-effects" aria-hidden="true"><circle class="shield-trail" cx="320" cy="338" r="260"/><g transform="translate(320 338)"><g class="hero-orbiter shield-orbit"><g transform="translate(0 -260)"><g class="hero-shield-spin">${shield}</g></g></g></g></g>`;
 if(type==='web')return `<g class="hero-effects web-effects" aria-hidden="true"><path class="web-shot" d="M185 300Q30 190 55 100M185 300Q40 450 100 595M185 300Q430 350 585 135"/><g class="web-orbit"><path d="M64 175Q320 12 576 175M64 175Q3 355 110 540M576 175Q637 355 530 540"/><path d="M64 175 110 215 155 177 200 198 248 158 320 178 390 158 440 198 485 177 530 215 576 175"/></g><g class="web-burst" transform="translate(585 135)"><path d="M-25 0H25M0-25V25M-18-18 18 18M18-18-18 18"/><circle r="13"/></g></g>`;
 return '';
}

// Activated only by catalog entries with real cutout artwork and an effect.
export function heroCharacter(character,cls){
 if(!HERO_EFFECTS.has(character.effect))return null;
 return `<svg class="${escape(cls)} character-motion hero-motion hero-${character.effect}" viewBox="0 0 640 676" role="img" aria-label="${escape(character.name)}" style="--character-color:${character.color}">${heroEffects(character.effect)}<image href="/assets/characters/${escape(character.id)}.webp" x="90" y="25" width="460" height="626" preserveAspectRatio="xMidYMid meet"/></svg>`;
}
