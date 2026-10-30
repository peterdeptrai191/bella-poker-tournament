import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {CHARACTERS} from '../public/characters.js';
import {accountRequest} from '../lib/accounts.js';
import {clearMemory} from '../lib/store.js';
import {goatGroups} from '../public/cr7-catalog.js';
import {animatedCharacter} from '../public/character-motion.js';

test('upcoming skins remain ordered, previewable and unavailable for purchase or packs',async()=>{
 clearMemory();
 const skins=CHARACTERS.filter(c=>c.comingSoon);
 assert.deepEqual(skins.map(c=>c.name),['Dangrangto','Jack97','MCK','Son Hyung Min','The Weeknd']);
 assert.deepEqual(CHARACTERS.slice(-5),skins);
 const call=(op,extra={},token)=>accountRequest({body:{op,requestId:randomUUID(),...extra},token,ip:'upcoming-test'});
 const u=await call('register',{username:'UpcomingTester',password:'test password'});
 for(const c of skins){
  assert.equal(c.price,null);assert.equal(c.event,undefined);
  assert.match(animatedCharacter(c),/upcoming-effects/);
  assert.match(animatedCharacter(c),new RegExp(c.asset.replace('.', '\\.')));
  await assert.rejects(()=>call('buySkin',{character:c.id},u.cookieToken),/Coming Soon/);
 }
 assert.ok(Object.values(goatGroups()).flat().every(id=>!skins.some(c=>c.id===id)));
 const after=await call('account',{},u.cookieToken);
 assert.equal(after.account.coins,u.account.coins);
 assert.deepEqual(after.account.ownedSkins,u.account.ownedSkins);
 for(const tier of [3,10,15,20])assert.ok(CHARACTERS.filter(c=>!c.comingSoon&&c.price===tier).every(c=>!skins.includes(c)));
});
