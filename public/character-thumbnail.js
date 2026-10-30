// Catalog tiles are lightweight stills; selecting one opens the full animated preview.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function characterThumbnail(c,cls='character-avatar'){
 const asset=c.id.startsWith('goat-')?`/assets/events/goat/${c.id}.webp`:c.id.startsWith('cr7-')?`/assets/events/cr7-boat/${c.id}-clean.webp`:`/assets/characters/${c.asset||c.id+'.webp'}`;
 if(c.artBox)return `<svg class="${esc(cls)} character-thumbnail" viewBox="${esc(c.artBox)}" role="img" aria-label="Bella · ${esc(c.name)}"><image href="${esc(asset)}" width="${c.artWidth}" height="${c.artHeight}"/></svg>`;
 return `<img class="${esc(cls)} character-thumbnail" src="${esc(asset)}" alt="Bella · ${esc(c.name)}" loading="lazy" decoding="async" width="85" height="95">`;
}
