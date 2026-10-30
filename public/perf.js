// Battery and heat: animated characters (and other looping effects) that are off screen or hidden behind a
// dialog stop animating; they carry on exactly where they were when they come back into view.
const SEL='.character-motion,.potw-board,.promo,.goat-head';
const io=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{for(const e of entries)e.target.classList.toggle('anim-off',!e.isIntersecting);},{rootMargin:'80px'});
const seen=new WeakSet();
function scan(root){if(!io||!root.querySelectorAll)return;if(root.matches?.(SEL)&&!seen.has(root)){seen.add(root);io.observe(root);}for(const el of root.querySelectorAll(SEL))if(!seen.has(el)){seen.add(el);io.observe(el);}}
// behind an open modal dialog nothing on the page needs to move
function underDialog(){const open=[...document.querySelectorAll('dialog[open]')].some(d=>d.matches(':modal'));document.body.classList.toggle('modal-up',open);}
if(typeof window!=='undefined'&&io){
 new MutationObserver(list=>{for(const m of list)for(const n of m.addedNodes)if(n.nodeType===1)scan(n);underDialog();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
 addEventListener('DOMContentLoaded',()=>scan(document.body));scan(document.documentElement);
}
