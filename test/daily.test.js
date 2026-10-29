import test from 'node:test';import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {accountRequest,authenticateAccount,accountDocument,vnDay,dailyStatus,GRANTS} from '../lib/accounts.js';
import {createHash} from 'node:crypto';
import {writeRecord,clearMemory} from '../lib/store.js';
import {chipBreakdown,DAILY_REWARDS} from '../public/chip-skin-catalog.js';
const auth=(op,extra={},token)=>accountRequest({body:{op,requestId:randomUUID(),...extra},token,ip:'daily-tests'});
async function user(name){const r=await auth('register',{username:name,password:'test password'});return {identity:await authenticateAccount(r.cookieToken),token:r.cookieToken,account:r.account};}
async function setDaily(u,daily){const {raw,value}=await accountDocument(u.identity);value.daily=daily;await writeRecord(u.identity.key,raw,value);}

test('new accounts start on day 1 with the clay chips equipped',async()=>{
 clearMemory();const u=await user('Daily One');
 assert.deepEqual(u.account.daily,{day:1,claimed:false});assert.deepEqual(u.account.ownedChipSkins,['classic']);assert.equal(u.account.equippedChipSkin,'classic');
});

test('the daily gift pays once per day even when claimed twice at the same time',async()=>{
 clearMemory();const u=await user('Daily Two');
 const results=await Promise.all([auth('claimDaily',{},u.token),auth('claimDaily',{},u.token)]);
 const paid=results.filter(r=>!r.result.already);assert.equal(paid.length,1);assert.deepEqual(paid[0].result,{day:1,coins:1,chip:null});
 const a=(await auth('account',{},u.token)).account;assert.equal(a.coins,1);assert.deepEqual(a.daily,{day:1,claimed:true});
});

test('coming back the next day moves along the calendar and day 3 unlocks the ceramic chips',async()=>{
 clearMemory();const u=await user('Daily Three');await setDaily(u,{lastDay:vnDay()-1,streak:2});
 const r=await auth('claimDaily',{},u.token);assert.deepEqual(r.result,{day:3,coins:1,chip:'ceramic'});
 assert.deepEqual(r.account.ownedChipSkins,['classic','ceramic']);
 await auth('equipChipSkin',{skin:'ceramic'},u.token);assert.equal((await auth('account',{},u.token)).account.equippedChipSkin,'ceramic');
});

test('day 7 pays 2 coins with the neon chips (just the coins if already owned) and wraps back to day 1',async()=>{
 clearMemory();const u=await user('Daily Four');const {raw,value}=await accountDocument(u.identity);value.ownedChipSkins=['classic','neon'];value.daily={lastDay:vnDay()-1,streak:6};await writeRecord(u.identity.key,raw,value);
 const r=await auth('claimDaily',{},u.token);assert.deepEqual(r.result,{day:7,coins:2,chip:null});
 assert.equal(dailyStatus({daily:{lastDay:vnDay()-1,streak:7}}).day,1);
});

test('missing a day starts the calendar again but keeps earned chips',async()=>{
 clearMemory();const u=await user('Daily Five');const {raw,value}=await accountDocument(u.identity);value.ownedChipSkins=['classic','ceramic'];value.daily={lastDay:vnDay()-3,streak:4};await writeRecord(u.identity.key,raw,value);
 const r=await auth('claimDaily',{},u.token);assert.equal(r.result.day,1);assert.deepEqual(r.account.ownedChipSkins,['classic','ceramic']);
});

test('chip skins can only be equipped once earned',async()=>{
 clearMemory();const u=await user('Daily Six');
 await assert.rejects(()=>auth('equipChipSkin',{skin:'neon'},u.token),/quà đăng nhập/);
 await assert.rejects(()=>auth('equipChipSkin',{skin:'gold'},u.token),/không hợp lệ/);
});

test('daily coins: 1 a day, 2 on day 7',()=>{assert.deepEqual(DAILY_REWARDS.map(r=>r.coins),[1,1,1,1,1,1,2]);});

test('the login coin box opens only once per day however often you log in',async()=>{
 clearMemory();await auth('register',{username:'Box Farmer',password:'test password'});
 const first=await auth('login',{username:'Box Farmer',password:'test password'});assert.ok(first.gift>=1&&first.gift<=5);
 for(let i=0;i<5;i++){const again=await auth('login',{username:'Box Farmer',password:'test password'});assert.equal(again.gift,null);assert.equal(again.account.coins,first.gift);}
 const u={identity:await authenticateAccount(first.cookieToken)};const {raw,value}=await accountDocument(u.identity);
 assert.equal(value.loginCount,7);assert.ok(value.lastLoginAt>0);value.loginGiftDay=vnDay()-1;await writeRecord(u.identity.key,raw,value);
 const tomorrow=await auth('login',{username:'Box Farmer',password:'test password'});assert.ok(tomorrow.gift>=1);
});

test('the M10 skin is given to its owner on register, and costs 5 coins for everyone else',async()=>{
 clearMemory();GRANTS[0].users.push(createHash('sha256').update('m10 tester').digest('hex'));
 const owner=await auth('register',{username:'M10 Tester',password:'test password'});assert.ok(owner.account.ownedSkins.includes('bella-m10'));
 const other=await auth('register',{username:'Someone Else',password:'test password'});assert.ok(!other.account.ownedSkins.includes('bella-m10'));
 const {CHARACTERS}=await import('../public/characters.js');assert.equal(CHARACTERS.find(c=>c.id==='bella-m10').price,5);assert.equal(CHARACTERS.find(c=>c.id==='bella-portugal-7').price,5);
});

test('calendar has seven days and the three gift chips sit on days 3, 5 and 7',()=>{
 assert.equal(DAILY_REWARDS.length,7);assert.deepEqual(DAILY_REWARDS.filter(r=>r.chip).map(r=>[r.day,r.chip]),[[3,'ceramic'],[5,'bella'],[7,'neon']]);
});

test('amounts split into readable chip stacks',()=>{
 const show=a=>chipBreakdown(a).map(({value,count})=>count+'x'+value).join(' ');
 assert.equal(show(150),'6x25');
 assert.equal(show(1200),'2x500 2x100');
 assert.equal(show(12450),'2x5000 2x1000 4x100 2x25');
 assert.equal(show(25275),'5x5000 2x100 3x25');
 assert.equal(show(10),'1x25');assert.equal(show(0),'');
});

test('players can change the name others see, never to a name someone else has',async()=>{
 clearMemory();const a=await user('Anna');const b=await user('Binh');
 const r=await auth('renameAccount',{name:'  Anna   Pro '},a.token);assert.equal(r.account.name,'Anna Pro');assert.equal(r.account.username,'Anna');
 await assert.rejects(()=>auth('renameAccount',{name:'anna pro'},b.token),/đã có người dùng/);
 await assert.rejects(()=>auth('renameAccount',{name:'ANNA'},b.token),/đã có người dùng/);   // someone's login name
 await assert.rejects(()=>auth('renameAccount',{name:'x'},b.token),/2–22/);
 await assert.rejects(()=>auth('register',{username:'Anna Pro',password:'p'}),/sử dụng/);  // display names block new logins too
 // the old name is freed when Anna changes again, and she can go back to her login name
 await auth('renameAccount',{name:'Anna Queen'},a.token);
 assert.equal((await auth('renameAccount',{name:'Anna Pro'},b.token)).account.name,'Anna Pro');
 assert.equal((await auth('renameAccount',{name:'Anna'},a.token)).account.name,'Anna');
});

test('two players grabbing the same new name at once: only one gets it',async()=>{
 clearMemory();const a=await user('Racer A');const b=await user('Racer B');
 const res=await Promise.allSettled([auth('renameAccount',{name:'Speedy'},a.token),auth('renameAccount',{name:'Speedy'},b.token)]);
 assert.equal(res.filter(x=>x.status==='fulfilled').length,1);
});

test('with the big blind given, bigger pots show more chips, the total always matches, at most 60 chips',async()=>{
 const {chipBreakdown,MAX_PILE}=await import('../public/chip-skin-catalog.js');
 const sum=parts=>parts.reduce((n,c)=>n+c.value*c.count,0),count=parts=>parts.reduce((n,c)=>n+c.count,0);
 let last=0;
 for(const pot of [150,500,1200,2500,5000,12450,25000]){const p=chipBreakdown(pot,50);
  assert.equal(sum(p),Math.round(pot/25)*25);assert.ok(count(p)<=MAX_PILE);assert.ok(count(p)>=last,`pot ${pot} shows fewer chips than a smaller pot`);last=count(p);}
 assert.ok(count(chipBreakdown(5000,50))>=8*count(chipBreakdown(5000)));     // far more than the plain dealer split
 assert.ok(chipBreakdown(12450,50).length>=4);                               // several colours, not one
});
