import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {accountRequest,authenticateAccount,accountDocument} from '../lib/accounts.js';
import {clearMemory,writeRecord} from '../lib/store.js';
import {cr7Skins,goatSkins,goatTiles,isCheap,goatOdds,goatPick,goatFrame,GROUP_ODDS,goatInnerSize} from '../public/cr7-catalog.js';
import {CHARACTERS} from '../public/characters.js';
test('GOAT or BOAT: skins from 10 coin up and box skins; red 10%, gold GOAT/BOAT 40%, purple shop skins 50%, exactly as shown',()=>{
 assert.equal(cr7Skins().length,4);assert.equal(goatSkins().length,5);
 const tiles=goatTiles(),want=CHARACTERS.filter(c=>c.event||(typeof c.price==='number'&&c.price>=10)).map(c=>c.id);
 assert.deepEqual([...tiles].sort(),[...want].sort());assert.equal(new Set(tiles).size,tiles.length);
 assert.ok(!tiles.some(id=>isCheap(CHARACTERS.find(c=>c.id===id))));
 // walk every possible pair of rolls the server can make: the counts must equal the odds shown to players
 const odds=goatOdds(),count={},innerSize=goatInnerSize();for(let g=0;g<100;g++)for(let i=0;i<innerSize;i++){const id=goatPick(g,i);count[id]=(count[id]||0)+1;}
 for(const id of tiles)assert.ok(Math.abs(count[id]/(innerSize*100)-odds[id])<1e-12,id);
 const byFrame=f=>tiles.filter(id=>goatFrame(CHARACTERS.find(c=>c.id===id))===f).reduce((n,id)=>n+odds[id],0);
 assert.ok(Math.abs(byFrame('red')-GROUP_ODDS.red/100)<1e-12&&Math.abs(byFrame('gold')-.4)<1e-12&&Math.abs(byFrame('purple')-.5)<1e-12);
 assert.ok(odds['cr7-real']<odds['son-tung-mtp']&&odds['goat-m10-barca-2015']<odds['sydney-sweeney']);
});
test('box skins cannot be bought one by one and the free spin is used once',async()=>{
 clearMemory();const u=await accountRequest({body:{op:'register',username:'CR7 test',password:'pw'}}),token=u.cookieToken;
 const call=(op,body={})=>accountRequest({token,body:{op,requestId:randomUUID(),...body}});
 await assert.rejects(()=>call('buySkin',{character:cr7Skins()[0].id}),/chỉ nhận/);
 const requestId=randomUUID(),r=await Promise.all(Array.from({length:4},()=>call('openCr7Pack',{requestId,free:true})));
 assert.ok(r.every(x=>x.result.skin===r[0].result.skin));assert.equal(goatTiles()[r[0].result.tile],r[0].result.skin);assert.equal(r[0].account.coins,0);assert.equal(r[0].account.cr7Event.freeUsed,true);
 await assert.rejects(()=>call('openCr7Pack',{free:true}),/đã dùng/);
 await assert.rejects(()=>call('openCr7Pack',{free:false}),/17 coin/);
 const identity=await authenticateAccount(token),doc=await accountDocument(identity);doc.value.coins=17;await writeRecord(identity.key,doc.raw,doc.value);
 const paidId=randomUUID(),paid=await Promise.all(Array.from({length:3},()=>call('openCr7Pack',{requestId:paidId,free:false})));
 assert.ok(paid.every(x=>x.result.skin===paid[0].result.skin));assert.equal(paid[0].account.coins,0);assert.equal(paid[0].result.before,17);assert.equal(paid[0].result.after,0);
 await assert.rejects(()=>call('openCr7Pack',{requestId:paidId,free:true}),/đã sử dụng/);
 const login=await call('login',{username:'CR7 test',password:'pw'});assert.equal(login.account.cr7Event.freeUsed,true);
 assert.equal((await call('seeCr7Event')).account.cr7Event.seen,true);
});

test('GOAT or BOAT: at most 10 spins a day per account, the free spin included; repeats of the same spin do not count',async()=>{
 clearMemory();const u=await accountRequest({body:{op:'register',username:'Spin limit',password:'pw'}}),token=u.cookieToken;
 const call=(op,body={})=>accountRequest({token,body:{op,requestId:randomUUID(),...body}});
 const identity=await authenticateAccount(token),doc=await accountDocument(identity);doc.value.coins=1000;await writeRecord(identity.key,doc.raw,doc.value);
 const first=randomUUID();await call('openCr7Pack',{requestId:first,free:true});await call('openCr7Pack',{requestId:first,free:true});
 for(let i=0;i<9;i++)await call('openCr7Pack',{free:false});
 const acc=(await call('account')).account;assert.equal(acc.cr7Event.spinsToday,10);assert.equal(acc.coins,1000-9*17);
 await assert.rejects(()=>call('openCr7Pack',{free:false}),/đủ 10 lượt/);
 assert.equal((await call('account')).account.coins,1000-9*17);
});
test('logging in from two devices at the same moment opens the login coin box only once',async()=>{
 clearMemory();await accountRequest({body:{op:'register',username:'Two devices',password:'pw'}});
 const logins=await Promise.all(Array.from({length:4},()=>accountRequest({body:{op:'login',username:'Two devices',password:'pw',requestId:randomUUID()},ip:'device-'+Math.random()})));
 const paid=logins.filter(r=>r.gift);assert.equal(paid.length,1);
 const after=await accountRequest({body:{op:'login',username:'Two devices',password:'pw',requestId:randomUUID()}});assert.equal(after.gift,null);assert.equal(after.account.coins,paid[0].gift);
});
test('playing together: coins by number of friends, a shard each game, a ticket for the winner, missions and streak',async()=>{
 const {rewardGroupPlay,groupStatus}=await import('../lib/accounts.js');
 clearMemory();const ids=[];
 for(const n of ['Grp A','Grp B','Grp C']){const r=await accountRequest({body:{op:'register',username:n,password:'pw'}});const id=await authenticateAccount(r.cookieToken);ids.push({token:r.cookieToken,...id});}
 const room=(k,flush=false)=>({code:'R'+k,createdAt:k,highlights:flush?{flush:true}:undefined,players:[...ids.map((x,i)=>({id:'p'+i,accountId:x.id,accountKey:x.key,rank:i+1})),{id:'bot',isBot:true,rank:4}]});
 const first=await rewardGroupPlay(room(1,true));
 assert.deepEqual(first.p0,{coins:2,shards:2,tickets:1,missions:['flush'],streak:1});assert.equal(first.p1.tickets,0);
 assert.deepEqual(await rewardGroupPlay(room(1,true)),first);                     // same game twice pays once
 for(let k=2;k<=5;k++)await rewardGroupPlay(room(k));                             // 5 games: +2 shards mission
 const acc=(await accountRequest({token:ids[1].token,body:{op:'account'}})).account;
 // p1: 5 shards + 1 flush + 2 mission = 8 -> 1 ticket, 3 shards; coins 2 per game
 assert.equal(acc.tickets,1);assert.equal(acc.shards,3);assert.equal(acc.coins,10);assert.equal(acc.group.gamesToday,5);assert.ok(acc.group.play5Done&&acc.group.flushDone);
 // alone with bots: nothing
 assert.equal(await rewardGroupPlay({code:'S',createdAt:9,players:[{id:'x',accountId:ids[0].id,accountKey:ids[0].key,rank:1},{id:'b',isBot:true,rank:2}]}),null);
 // a ticket pays for a GOAT or BOAT spin
 const call=(op,body={})=>accountRequest({token:ids[1].token,body:{op,requestId:randomUUID(),...body}});
 await call('openCr7Pack',{free:true});const r=await call('openCr7Pack',{free:false,ticket:true});
 assert.equal(r.result.ticket,true);assert.equal(r.account.tickets,0);assert.equal(r.account.coins,10);
 await assert.rejects(()=>call('openCr7Pack',{free:false,ticket:true}),/chưa có vé/);
 assert.equal(groupStatus({}).streak,0);
});
