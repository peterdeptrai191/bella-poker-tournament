// Profession-themed orbit for the original Bella crew, alongside the bespoke premium effects.
// Built from HTML layers so every moving part (aura glow, dashed ring, orbiting icons) only changes opacity
// or transform: the browser moves ready-made layers on the GPU instead of repainting the picture each frame.
// The box keeps the old SVG geometry (640×676 viewBox, scaled to fit like preserveAspectRatio="meet").
const motifs={firefighter:'🔥',doctor:'✚',engineer:'⚙',chef:'♨',gardener:'🌿',dj:'♫',farmer:'🌾'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RING='<svg class="crew-ring" viewBox="0 0 640 676" aria-hidden="true"><ellipse cx="320" cy="338" rx="275" ry="270"/></svg>';
export function standardCharacter(c,cls){
 const icon=motifs[c.id]||'✦';
 return `<span class="${esc(cls)} character-motion standard-motion" role="img" aria-label="Bella · ${esc(c.name)}" style="--character-color:${c.color}"><span class="crew-box"><i class="crew-aura"></i>${RING}<img class="crew-art" src="/assets/characters/${esc(c.asset||c.id+'.webp')}" alt="" decoding="async" draggable="false"><span class="hero-effects crew-effects" aria-hidden="true">${[0,1,2,3].map(i=>`<b class="crew-icon" style="--crew-delay:${-i*3}s">${icon}</b>`).join('')}</span></span></span>`;
}
