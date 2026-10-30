import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {accountRequest,authenticateAccount,accountDocument} from '../lib/accounts.js';
import {clearMemory,writeRecord} from '../lib/store.js';
import {cr7Skins,goatSkins,goatTiles,isCheap} from '../public/cr7-catalog.js';
import {CHARACTERS} from '../public/characters.js';
test('GOAT or BOAT: every skin but the free one is on the wheel, skins under 10 coin on two tiles',()=>{
 assert.equal(cr7Skins().length,4);assert.equal(goatSkins().length,5);
 const tiles=goatTiles(),count=id=>tiles.filter(t=>t===id).length;
 for(const c of CHARACTERS){if(c.price===0)assert.equal(count(c.id),0);else assert.equal(count(c.id),isCheap(c)?2:1,c.id);}
 assert.equal(tiles.length,CHARACTERS.filter(c=>c.price!==0).length+CHARACTERS.filter(c=>c.price!==0&&isCheap(c)).length);
 for(let i=1;i<tiles.length;i++)assert.notEqual(tiles[i],tiles[i-1]);
});
test('box skins cannot be bought one by one and the free spin is used once',async()=>{
 clearMemory();const u=await accountRequest({body:{op:'register',username:'CR7 test',password:'pw'}}),token=u.cookieToken;
 const call=(op,body={})=>accountRequest({token,body:{op,requestId:randomUUID(),...body}});
 await assert.rejects(()=>call('buySkin',{character:cr7Skins()[0].id}),/chỉ nhận/);
 const requestId=randomUUID(),r=await Promise.all(Array.from({length:4},()=>call('openCr7Pack',{requestId,free:true})));
 assert.ok(r.every(x=>x.result.skin===r[0].result.skin));assert.equal(goatTiles()[r[0].result.tile],r[0].result.skin);assert.equal(r[0].account.coins,0);assert.equal(r[0].account.cr7Event.freeUsed,true);
 await assert.rejects(()=>call('openCr7Pack',{free:true}),/đã dùng/);
 await assert.rejects(()=>call('openCr7Pack',{free:false}),/20 coin/);
 const identity=await authenticateAccount(token),doc=await accountDocument(identity);doc.value.coins=20;await writeRecord(identity.key,doc.raw,doc.value);
 const paidId=randomUUID(),paid=await Promise.all(Array.from({length:3},()=>call('openCr7Pack',{requestId:paidId,free:false})));
 assert.ok(paid.every(x=>x.result.skin===paid[0].result.skin));assert.equal(paid[0].account.coins,0);assert.equal(paid[0].result.before,20);assert.equal(paid[0].result.after,0);
 await assert.rejects(()=>call('openCr7Pack',{requestId:paidId,free:true}),/đã sử dụng/);
 const login=await call('login',{username:'CR7 test',password:'pw'});assert.equal(login.account.cr7Event.freeUsed,true);
 assert.equal((await call('seeCr7Event')).account.cr7Event.seen,true);
});
