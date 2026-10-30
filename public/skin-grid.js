// Hydrate full-quality artwork only near the scroll viewport, retaining live nodes on updates.
export function createLazySkinArt(root,render,{Observer=globalThis.IntersectionObserver,keyFor=()=>''}={}){
 const slots=new Map(),targets=new Map();let closed=false;
 const hydrate=slot=>{const state=slots.get(slot);if(!state)return;const key=keyFor(slot.dataset.skinArt);if(!state.ready||state.key!==key){slot.innerHTML=render(slot.dataset.skinArt);state.ready=true;state.key=key;slot.dataset.artKey=key;}};
 const observer=Observer?new Observer(entries=>{if(closed)return;for(const e of entries){const slot=targets.get(e.target);if(!slot)continue;slot.classList.toggle('skin-art-off',!e.isIntersecting);if(e.isIntersecting)hydrate(slot);}},{root,rootMargin:'160px 0px'}):null;
 return {
  refresh(){if(closed)return;for(const slot of root.querySelectorAll('[data-skin-art]')){if(!slots.has(slot)){const target=slot.closest?.('.character-option')||slot;slots.set(slot,{ready:slot.childElementCount>0,key:slot.dataset.artKey??keyFor(slot.dataset.skinArt),target});targets.set(target,slot);observer?.observe(target);if(!observer)hydrate(slot);}const state=slots.get(slot);if(state.ready){hydrate(slot);slot.dataset.artKey=state.key;}}
   for(const slot of slots.keys())if(!root.contains(slot)){const target=slots.get(slot).target;observer?.unobserve(target);targets.delete(target);slots.delete(slot);}
  },
  disconnect(){closed=true;observer?.disconnect();slots.clear();targets.clear();}
 };
}
