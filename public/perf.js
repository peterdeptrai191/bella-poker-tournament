// Keep only live animation roots; detached SVG trees must not accumulate across shop opens.
const SEL='.character-motion,.potw-board,.promo,.goat-head';
export function createAnimationRegistry(observer){
 const tracked=new Set();
 return {
  scan(root){if(!root?.querySelectorAll)return;const add=el=>{if(!tracked.has(el)){tracked.add(el);observer?.observe(el);}};if(root.matches?.(SEL))add(root);root.querySelectorAll(SEL).forEach(add);},
  prune(){for(const el of tracked)if(!el.isConnected){observer?.unobserve(el);tracked.delete(el);}},
  get size(){return tracked.size;}
 };
}
if(typeof window!=='undefined'){
 const link=document.createElement('link');link.rel='stylesheet';link.href='/perf.css';document.head.append(link);
 const io=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{for(const e of entries)e.target.classList.toggle('anim-off',!e.isIntersecting);},{rootMargin:'60px'}),registry=createAnimationRegistry(io);
 let queued=false,modalDirty=true;const additions=new Set();
 const flush=()=>{queued=false;registry.prune();for(const root of additions)if(root.isConnected)registry.scan(root);additions.clear();if(modalDirty){modalDirty=false;document.body?.classList.toggle('modal-up',!!document.querySelector('dialog:modal'));}};
 const schedule=()=>{if(!queued){queued=true;queueMicrotask(flush);}};
 new MutationObserver(records=>{let work=false;for(const m of records){if(m.type==='attributes'){modalDirty=true;work=true;continue;}for(const n of m.addedNodes)if(n.nodeType===1){additions.add(n);work=true;if(n.matches('dialog')||n.querySelector('dialog'))modalDirty=true;}for(const n of m.removedNodes)if(n.nodeType===1){work=true;if(n.matches('dialog')||n.querySelector('dialog'))modalDirty=true;}}if(work)schedule();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
 const visibility=()=>document.documentElement.classList.toggle('perf-hidden',document.hidden);document.addEventListener('visibilitychange',visibility);visibility();
 registry.scan(document.documentElement);addEventListener('DOMContentLoaded',()=>{registry.scan(document.body);modalDirty=true;schedule();});
}
