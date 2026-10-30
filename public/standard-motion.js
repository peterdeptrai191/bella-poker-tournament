// Profession-themed orbit for the original Bella crew, alongside the bespoke premium effects.
const motifs={firefighter:'🔥',doctor:'✚',engineer:'⚙',chef:'♨',gardener:'🌿',dj:'♫',farmer:'🌾'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function standardCharacter(c,cls){
 const icon=motifs[c.id]||'✦';
 return `<svg class="${esc(cls)} character-motion standard-motion" viewBox="0 0 640 676" role="img" aria-label="Bella · ${esc(c.name)}" style="--character-color:${c.color}"><ellipse class="crew-aura" cx="320" cy="338" rx="230" ry="265"/><ellipse class="crew-ring" cx="320" cy="338" rx="275" ry="270"/><image href="/assets/characters/${esc(c.asset||c.id+'.webp')}" x="90" y="25" width="460" height="626" preserveAspectRatio="xMidYMid meet"/><g class="hero-effects crew-effects" aria-hidden="true">${[0,1,2,3].map(i=>`<g transform="translate(320 338)"><g class="crew-orbit" style="--crew-delay:${-i*3}s"><g transform="translate(0 -260)"><g class="crew-upright" style="--crew-delay:${-i*3}s"><text text-anchor="middle" dominant-baseline="central" fill="${c.color}" font-size="48">${icon}</text></g></g></g></g>`).join('')}</g></svg>`;
}
