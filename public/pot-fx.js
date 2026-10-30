// Table chip effects: pot stacks in the middle of the table, chips flying between seats and the pot,
// a chip shower for the winner, and the bust screen with a poker quote.
// Chips are plain HTML + CSS (no images), coloured by value and by the chip skin the viewer has on
// (see pot-fx.css), and animated with the Web Animations API. Sounds are five short recordings of real chips.
import {chipBreakdown,CHIP_VALUES} from '/chip-skin-catalog.js';
import {sfxEnabled} from '/settings.js';

const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=list=>list[Math.floor(Math.random()*list.length)];

// ---------- Chip stacks (side view) ----------
// An amount becomes one stack per chip value (see chipBreakdown), biggest value first. The table sets the big
// blind with setChipScale(), so a bigger pot shows more chips; pass bb:null for the plain dealer split.
let chipScale=null;
export const setChipScale=bb=>{chipScale=bb||null;};
export const chipTotal=(amount,bb=chipScale)=>chipBreakdown(amount,bb).reduce((n,c)=>n+c.count,0);
// `from` is how many chips were already shown last time: chips from that index on drop in, `delay` ms after
// this render. More than four stacks are piled in two rows like real chips on felt: the taller stacks stand
// at the back, the shorter ones in front and half a chip to the side, tallest in the middle of each row.
export function chipStacks(amount,{from=Infinity,delay=0,perColumn=10,bb=chipScale}={}){
 const columns=[];for(const {value,count} of chipBreakdown(amount,bb))for(let i=0;i<count;i+=perColumn)columns.push({value,n:Math.min(perColumn,count-i)});
 let index=0;
 for(const col of columns)col.html=`<div class="chip-column" data-chip="${col.value}" style="--h:${col.n}">${Array.from({length:col.n},(_,i)=>{const fresh=index>=from,html=`<i class="chip${i===col.n-1?' top':''}${fresh?' drop':''}" style="--i:${i}${fresh?`;--d:${delay+(index-from)*40}ms`:''}"></i>`;index++;return html;}).join('')}</div>`;
 if(columns.length<=4)return `<div class="chip-stacks" aria-hidden="true">${columns.map(c=>c.html).join('')}</div>`;
 const byHeight=[...columns].sort((a,b)=>b.n-a.n),centred=list=>list.reduce((row,c,i)=>i%2?[...row,c]:[c,...row],[]);
 const back=centred(byHeight.filter((_,i)=>i%2===0)),front=centred(byHeight.filter((_,i)=>i%2===1));
 return `<div class="chip-stacks chip-pile" aria-hidden="true"><div class="pile-row back">${back.map(c=>c.html).join('')}</div><div class="pile-row front">${front.map(c=>c.html).join('')}</div></div>`;
}
// One chip seen from above, for flying chips, the shower and the skin picker.
export const chipFace=(value,size=40)=>`<span class="tc" data-chip="${value}" data-label="${value>=1000?value/1000+'K':value}" style="--s:${size}px" aria-hidden="true"></span>`;

// ---------- Flying chips ----------
let layer=null;
function fxLayer(){if(!layer||!layer.isConnected){layer=document.createElement('div');layer.className='fx-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);}return layer;}
const center=el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,r};};
function flyingChip(value,size){const holder=document.createElement('div');holder.innerHTML=chipFace(value,size);const chip=holder.firstChild;chip.classList.add('fly-chip');fxLayer().append(chip);return chip;}

// A few chips leave one element and land on another along a little arc. Their colours are the values of
// the bet itself. The layer lives outside #app, so the table re-rendering mid-flight never cuts the animation.
export function flyChips(fromEl,toEl,{count=4,delay=0,duration=520,amount=0}={}){
 if(!fromEl||!toEl||reduced())return 0;const a=center(fromEl),b=center(toEl);if(!a.r.width||!b.r.width)return 0;
 const values=chipBreakdown(amount,chipScale).map(c=>c.value);if(!values.length)values.push(...CHIP_VALUES.slice(2));
 for(let i=0;i<count;i++){
  const chip=flyingChip(values[i%values.length],16);
  const jx=rand(-10,10),jy=rand(-6,6),lift=Math.min(70,Math.hypot(b.x-a.x,b.y-a.y)*.25);
  const x0=a.x+jx,y0=a.y+jy,x1=b.x+jx*.6,y1=b.y+jy*.4,mx=(x0+x1)/2,my=Math.min(y0,y1)-lift;
  chip.animate([{transform:`translate(${x0}px,${y0}px) scale(.7)`,opacity:0},{transform:`translate(${x0}px,${y0}px) scale(1)`,opacity:1,offset:.08},{transform:`translate(${mx}px,${my}px) scale(1.05)`,offset:.5},{transform:`translate(${x1}px,${y1}px) scale(.85)`,opacity:1,offset:.92},{transform:`translate(${x1}px,${y1}px) scale(.6)`,opacity:0}],{duration,delay:delay+i*55,easing:'cubic-bezier(.4,0,.3,1)',fill:'both'}).finished.then(()=>chip.remove(),()=>chip.remove());
 }
 return delay+(count-1)*55+duration;
}

// ---------- Chip shower ----------
// full: the whole screen rains chips (you won). Otherwise chips fall onto `target` (someone else won).
export function chipRain({full=true,target=null,delay=0,volume=1}={}){
 const ms=2000;playSound('win',{delay,volume:full?volume:volume*.45});if(reduced())return;
 const area=target?.getBoundingClientRect(),w=innerWidth,h=innerHeight,count=full?38:14;
 for(let i=0;i<count;i++){
  const size=full?rand(18,30):rand(14,20),chip=flyingChip(pick(CHIP_VALUES),Math.round(size));chip.classList.replace('fly-chip','rain-chip');
  const x=full?rand(-10,w-10):area.left+area.width/2+rand(-area.width*.6,area.width*.6),end=full?h+40:area.top+area.height*.6;
  const fall=rand(900,1350),start=delay+rand(0,ms-fall),spin=rand(-540,540),drift=rand(-40,40);
  chip.animate([{transform:`translate(${x}px,-40px) rotate(0deg) scaleX(1)`,opacity:1},{transform:`translate(${x+drift/2}px,${end*.45}px) rotate(${spin/2}deg) scaleX(.35)`,offset:.45},{transform:`translate(${x+drift}px,${end}px) rotate(${spin}deg) scaleX(1)`,opacity:full?1:0}],{duration:fall,delay:start,easing:'cubic-bezier(.45,0,.85,.7)',fill:'both'}).finished.then(()=>chip.remove(),()=>chip.remove());
 }
}

// ---------- Sound: five recordings of real chips on a table, from one chip to a whole stack ----------
// They are decoded once into memory, so a sound starts instantly and several can overlap.
// Browsers only allow audio after the player has touched the page, so everything starts on the first tap.
const SOUNDS={one:'/assets/sfx/chip-1.mp3',small:'/assets/sfx/chip-stack-s.mp3',medium:'/assets/sfx/chip-stack-m.mp3',allin:'/assets/sfx/chip-allin.mp3',win:'/assets/sfx/chip-win.mp3',cheer:'/assets/sfx/crowd-cheer.mp3',crowd:'/assets/sfx/crowd-cheer-long.mp3'};
let audio=null,loading=null;const buffers={};
function load(){loading??=Promise.all(Object.entries(SOUNDS).map(async([name,url])=>{try{const data=await (await fetch(url)).arrayBuffer();buffers[name]=await audio.decodeAudioData(data);}catch{}}));return loading;}
function unlock(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();load();}catch{}}
if(typeof window!=='undefined'){for(const type of ['pointerdown','keydown'])window.addEventListener(type,unlock,{capture:true,passive:true});}
export function playSound(name,{delay=0,volume=1}={}){
 if(!audio||audio.state!=='running'||!buffers[name]||volume<=0||!sfxEnabled())return;
 const source=audio.createBufferSource(),gain=audio.createGain();source.buffer=buffers[name];gain.gain.value=volume;source.connect(gain).connect(audio.destination);source.start(audio.currentTime+delay/1000);
}
// A whoosh made on the spot: a burst of noise swept from low to high through a band filter.
export function whoosh({volume=.7,ms=650}={}){
 if(!audio||audio.state!=='running'||!sfxEnabled())return;
 const t=audio.currentTime,len=Math.ceil(audio.sampleRate*ms/1000),buf=audio.createBuffer(1,len,audio.sampleRate),d=buf.getChannelData(0);
 for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
 const src=audio.createBufferSource(),bp=audio.createBiquadFilter(),g=audio.createGain();src.buffer=buf;bp.type='bandpass';bp.Q.value=1.4;
 bp.frequency.setValueAtTime(260,t);bp.frequency.exponentialRampToValueAtTime(3200,t+ms/1000*.7);
 g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+ms/1000*.35);g.gain.exponentialRampToValueAtTime(0.0001,t+ms/1000);
 src.connect(bp).connect(g).connect(audio.destination);src.start(t);src.stop(t+ms/1000);
}
// Plays a recording with its volume following `points` ([seconds, gain] pairs). Returns a control whose
// peak(gain) jumps straight to that loudness (used when the player skips ahead).
export function playShaped(name,points,{delay=0}={}){
 if(!audio||audio.state!=='running'||!buffers[name]||!sfxEnabled())return {peak(){},stop(){}};
 const t=audio.currentTime+delay/1000,src=audio.createBufferSource(),g=audio.createGain();src.buffer=buffers[name];
 g.gain.setValueAtTime(points[0][1],t);for(const [at,v] of points.slice(1))g.gain.linearRampToValueAtTime(v,t+at);
 src.connect(g).connect(audio.destination);src.start(t);
 return {peak(v){const n=audio.currentTime;g.gain.cancelScheduledValues(n);g.gain.setValueAtTime(v,n);g.gain.linearRampToValueAtTime(0,n+2.2);},stop(){try{src.stop();}catch{}}};
}
// A heavy stadium gate rolling open, made on the spot: a deep rumble, metal grinding that wobbles, and a
// loud clunk when it stops.
export function gateSound(ms=3000,volume=.9){
 if(!audio||audio.state!=='running'||!sfxEnabled())return;
 const t=audio.currentTime,d=ms/1000,len=Math.ceil(audio.sampleRate*d),buf=audio.createBuffer(1,len,audio.sampleRate),x=buf.getChannelData(0);
 let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;x[i]=last*3.5;}           // brown noise
 const rumble=audio.createBufferSource(),lp=audio.createBiquadFilter(),rg=audio.createGain();rumble.buffer=buf;lp.type='lowpass';lp.frequency.value=140;
 rg.gain.setValueAtTime(.0001,t);rg.gain.exponentialRampToValueAtTime(volume,t+.5);rg.gain.setValueAtTime(volume,t+d-.4);rg.gain.exponentialRampToValueAtTime(.0001,t+d);
 rumble.connect(lp).connect(rg).connect(audio.destination);rumble.start(t);rumble.stop(t+d);
 const white=audio.createBuffer(1,len,audio.sampleRate),wd=white.getChannelData(0);for(let i=0;i<len;i++)wd[i]=Math.random()*2-1;
 const grind=audio.createBufferSource(),bp=audio.createBiquadFilter(),gg=audio.createGain(),lfo=audio.createOscillator(),lg=audio.createGain();
 grind.buffer=white;bp.type='bandpass';bp.Q.value=9;bp.frequency.setValueAtTime(700,t);bp.frequency.linearRampToValueAtTime(980,t+d);
 lfo.frequency.value=7;lg.gain.value=.12;lfo.connect(lg).connect(gg.gain);gg.gain.setValueAtTime(.0001,t);gg.gain.linearRampToValueAtTime(volume*.25,t+.6);gg.gain.setValueAtTime(volume*.25,t+d-.35);gg.gain.linearRampToValueAtTime(.0001,t+d);
 grind.connect(bp).connect(gg).connect(audio.destination);grind.start(t);grind.stop(t+d);lfo.start(t);lfo.stop(t+d);
 const thump=audio.createOscillator(),tg=audio.createGain(),te=t+d-.05;thump.type='sine';thump.frequency.setValueAtTime(95,te);thump.frequency.exponentialRampToValueAtTime(38,te+.35);
 tg.gain.setValueAtTime(.0001,te);tg.gain.exponentialRampToValueAtTime(volume*1.2,te+.02);tg.gain.exponentialRampToValueAtTime(.0001,te+.6);thump.connect(tg).connect(audio.destination);thump.start(te);thump.stop(te+.65);
}
// The bigger the bet, the bigger the sound: one chip for blinds and small calls, a short stack for an
// ordinary raise, a bigger stack for a large raise, and a whole stack pushed in for an all-in.
export function betSound(amount,bb,{allIn=false,delay=0,volume=.85}={}){
 const units=amount/Math.max(1,bb);playSound(allIn||units>25?'allin':units>8?'medium':units>2.5?'small':'one',{delay,volume});
}

// ---------- Bust screen ----------
// Each quote is widely attributed to the person named; the Vietnamese line is our translation.
export const QUOTES=[
 {en:'A chip and a chair.',vi:'Chỉ cần một chip và một chiếc ghế là còn cơ hội.',by:'Jack Straus'},
 {en:'Fold and live to fold again.',vi:'Bỏ bài để còn sống mà bỏ bài tiếp.',by:'Stu Ungar'},
 {en:"Poker is 100% skill and 50% luck.",vi:'Poker là 100% kỹ năng và 50% may mắn.',by:'Phil Hellmuth'},
 {en:"If there weren't luck involved, I would win every time.",vi:'Nếu không có may rủi, ván nào tôi cũng thắng.',by:'Phil Hellmuth'},
 {en:"If you can't spot the sucker in your first half hour at the table, then you are the sucker.",vi:'Ngồi nửa tiếng mà chưa nhận ra ai là con mồi, thì con mồi chính là bạn.',by:'Rounders (1998)'},
 {en:'Few players recall big pots they have won, but every player can remember the tough beats of his career.',vi:'Ít ai nhớ những pot lớn mình đã thắng, nhưng ai cũng nhớ rõ những lần thua đau.',by:'Rounders (1998)'},
 {en:"In the long run there's no luck in poker, but the short run is longer than most people know.",vi:'Về lâu dài poker không có may rủi, nhưng "ngắn hạn" dài hơn bạn tưởng nhiều.',by:'Rick Bennet'},
 {en:'Trust everyone, but always cut the cards.',vi:'Tin mọi người, nhưng luôn tự cắt bài.',by:'Benny Binion'},
 {en:'The guy who invented poker was bright, but the guy who invented the chip was a genius.',vi:'Người nghĩ ra poker thì thông minh, người nghĩ ra chip mới là thiên tài.',by:'Julius "Big Julie" Weintraub'},
 {en:'Life is not always a matter of holding good cards, but sometimes, playing a poor hand well.',vi:'Cuộc đời không phải lúc nào cũng là cầm bài đẹp, mà đôi khi là chơi hay một ván bài xấu.',by:'Jack London'},
 {en:"You've got to know when to hold 'em, know when to fold 'em.",vi:'Phải biết lúc nào nên giữ, lúc nào nên buông.',by:'Kenny Rogers, "The Gambler"'},
 {en:'Nobody is always a winner, and anybody who says he is, is either a liar or doesn\'t play poker.',vi:'Không ai thắng mãi. Ai nói mình luôn thắng thì hoặc nói dối, hoặc không chơi poker.',by:'Amarillo Slim'},
 {en:'You can shear a sheep many times, but you can skin him only once.',vi:'Cừu thì xén lông được nhiều lần, nhưng lột da chỉ được một lần.',by:'Amarillo Slim'},
 {en:'Limit poker is a science, but no-limit is an art. In no-limit, the target comes alive and shoots back at you.',vi:'Limit là khoa học, no-limit là nghệ thuật. Ở no-limit, tấm bia sống dậy và bắn lại bạn.',by:'Jack Straus'},
 {en:'The beautiful thing about poker is that everybody thinks they can play.',vi:'Cái hay của poker là ai cũng nghĩ mình biết chơi.',by:'Chris Moneymaker'},
 {en:'The trick to poker is mastering the luck.',vi:'Bí quyết của poker là làm chủ được vận may.',by:'Jesse May'},
 {en:'I must complain the cards are ill shuffled till I have a good hand.',vi:'Tôi sẽ còn kêu bài xào dở cho tới khi cầm được bài đẹp.',by:'Jonathan Swift'},
 {en:'Cards are war, in disguise of a sport.',vi:'Đánh bài là chiến tranh khoác áo thể thao.',by:'Charles Lamb'},
 {en:'Poker is war. People pretend it is a game.',vi:'Poker là chiến tranh. Người ta chỉ giả vờ đó là trò chơi.',by:'Doyle Brunson'},
 {en:'The commonest mistake in history is underestimating your opponent; it happens at the poker table all the time.',vi:'Sai lầm phổ biến nhất lịch sử là coi thường đối thủ, và bàn poker chứng kiến điều đó mỗi ngày.',by:'David Shoup'}
];
let lastQuote=-1;
export function pickQuote(){let i;do i=Math.floor(Math.random()*QUOTES.length);while(i===lastQuote&&QUOTES.length>1);lastQuote=i;return QUOTES[i];}

// Darkens the whole table and shows one quote for 5 seconds; "Bỏ qua" closes it early.
export function showBustQuote({rank,delay=0,ms=5000}={}){
 setTimeout(()=>{
  document.querySelector('.bust-quote')?.remove();const q=pickQuote(),el=document.createElement('section');
  el.className='bust-quote';el.setAttribute('role','dialog');el.setAttribute('aria-label','Bạn đã bị loại');
  el.innerHTML=`<div class="bust-card"><small>BẠN ĐÃ BỊ LOẠI${rank?` · HẠNG #${rank}`:''}</small><span class="bust-mark" aria-hidden="true">“</span><blockquote><p lang="en">${q.en}</p><p class="bust-vi">${q.vi}</p></blockquote><cite>— ${q.by}</cite><div class="bust-bar" aria-hidden="true"><i style="animation-duration:${ms}ms"></i></div><button type="button" class="bust-skip">Bỏ qua ›</button><p class="bust-note">Bạn vẫn có thể ở lại xem những người còn lại thi đấu.</p></div>`;
  document.body.append(el);document.body.classList.add('busted');
  const close=()=>{if(!el.isConnected)return;clearTimeout(timer);document.removeEventListener('keydown',onKey);el.classList.add('leaving');document.body.classList.remove('busted');setTimeout(()=>el.remove(),260);};
  const onKey=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',onKey);
  const timer=setTimeout(close,ms);el.querySelector('.bust-skip').onclick=close;el.querySelector('.bust-skip').focus({preventScroll:true});
 },delay);
}
