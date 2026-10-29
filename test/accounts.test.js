import test from 'node:test';import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {accountRequest,authenticateAccount,accountDocument,rewardFinishedTournament,cookieToken,cookieHeader} from '../lib/accounts.js';
import {readRecord,writeRecord,readRoom,writeRoom,clearMemory} from '../lib/store.js';
import {service} from '../lib/service.js';import {CHARACTERS,DEFAULT_CHARACTER} from '../public/characters.js';
const auth=(op,extra={},token)=>accountRequest({body:{op,requestId:randomUUID(),...extra},token,ip:'auth-tests'});
async function user(username){const result=await auth('register',{username,password:'test password'});return {result,identity:await authenticateAccount(result.cookieToken),token:result.cookieToken};}
const roomCall=(account,body,token,code)=>service({account,method:body?'POST':'GET',body:body?{requestId:randomUUID(),...body}:undefined,token,code,ip:'wallet-room'});

test('card skins cost 3 coins, require ownership, and charge atomically only once',async()=>{
 clearMemory();const u=await user('CardShop');
 assert.deepEqual(u.result.account.ownedCardSkins,['classic']);assert.equal(u.result.account.equippedCardSkin,'classic');
 await assert.rejects(()=>auth('buyCardSkin',{skin:'neon',price:0},u.token),/chưa đủ/);
 await assert.rejects(()=>auth('equipCardSkin',{skin:'neon'},u.token),/chưa sở hữu/);
 await assert.rejects(()=>auth('buyCardSkin',{skin:'invalid'},u.token),/không hợp lệ/);
 const {raw,value}=await accountDocument(u.identity);value.coins=3;await writeRecord(u.identity.key,raw,value);
 await Promise.all(Array.from({length:4},()=>auth('buyCardSkin',{skin:'neon',price:0},u.token)));
 let a=(await auth('account',{},u.token)).account;assert.equal(a.coins,0);assert.deepEqual(a.ownedCardSkins,['classic','neon']);
 await assert.rejects(()=>auth('buyCardSkin',{skin:'ruby'},u.token),/chưa đủ/);
 await auth('equipCardSkin',{skin:'neon'},u.token);a=(await auth('account',{},u.token)).account;assert.equal(a.equippedCardSkin,'neon');
 await auth('equipCardSkin',{skin:'classic'},u.token);assert.equal((await auth('account',{},u.token)).account.coins,0);
 const {CARD_SKINS}=await import('../public/card-skin-catalog.js');assert.equal(CARD_SKINS.find(c=>c.id==='classic').price,0);assert.equal(CARD_SKINS.filter(c=>c.price===3).length,6);
});

test('rooms share trusted card skins and freeze each hand appearance for results',async()=>{
 clearMemory();const u=await user('NeonPlayer'),v=await user('RubyPlayer');
 for(const [user,skin] of [[u,'neon'],[v,'ruby']]){const {raw,value}=await accountDocument(user.identity);value.coins=3;await writeRecord(user.identity.key,raw,value);await auth('buyCardSkin',{skin},user.token);await auth('equipCardSkin',{skin},user.token);}
 const created=await roomCall(u.identity,{op:'create',peek:true,cardSkin:'gold'}),code=created.room.code;
 const joined=await roomCall(v.identity,{op:'join',code,cardSkin:'gold'});assert.equal(joined.room.players.find(p=>p.id===created.room.me).cardSkin,'neon');assert.equal(joined.room.players.find(p=>p.id===joined.room.me).cardSkin,'ruby');
 await roomCall(u.identity,{op:'ready',ready:true,code},created.token);await roomCall(v.identity,{op:'ready',ready:true,code},joined.token);
 await roomCall(u.identity,{op:'start',code},created.token);await auth('equipCardSkin',{skin:'classic'},u.token);
 const live=await roomCall(u.identity,null,created.token,code);assert.equal(live.room.players.find(p=>p.id===created.room.me).cardSkin,'neon');assert.equal(live.room.players.find(p=>p.id===joined.room.me).hole,null);
 const {raw,room}=await readRoom(code);room.hand.stage='complete';room.hand.showdown=true;room.hand.nextHandAt=Date.now()+60000;await writeRoom(code,raw,room);
 const result=await roomCall(v.identity,null,joined.token,code);assert.equal(result.room.players.find(p=>p.id===created.room.me).cardSkin,'neon');assert.equal(result.room.players.find(p=>p.id===joined.room.me).cardSkin,'ruby');assert.ok(result.room.players.every(p=>p.hole?.length===2));assert.ok(!JSON.stringify(result.room).includes('accountKey'));
});

test('registration, password verification, session restoration, case uniqueness and revocable logout',async()=>{
 clearMemory();const u=await user('Player One');assert.equal(u.result.account.coins,0);assert.equal(u.result.account.equippedSkin,DEFAULT_CHARACTER);assert.deepEqual(u.result.account.ownedSkins,[DEFAULT_CHARACTER]);
 const stored=(await accountDocument(u.identity)).value;assert.notEqual(stored.passwordHash,'test password');assert.equal(stored.passwordHash.length,128);assert.ok(!JSON.stringify(u.result.account).includes('password'));
 await assert.rejects(()=>auth('register',{username:'player one',password:'x'}),/sử dụng/);
 await assert.rejects(()=>auth('login',{username:'Player One',password:'wrong'}),/chưa đúng/);
 const login={username:'PLAYER ONE',password:'test password',requestId:randomUUID()};const [a,b]=await Promise.all([auth('login',login),auth('login',login)]);
 assert.ok(a.gift>=1&&a.gift<=5);assert.equal(a.gift,b.gift);assert.equal(a.account.coins,a.gift);assert.equal((await auth('account',{},b.cookieToken)).account.coins,a.gift);
 const again=await auth('login',{username:'Player One',password:'test password'});assert.equal(again.account.coins,a.gift+again.gift);
 assert.equal(cookieToken(cookieHeader(again.cookieToken,true)),again.cookieToken);assert.match(cookieHeader(again.cookieToken,true),/HttpOnly; SameSite=Strict/);assert.match(cookieHeader(again.cookieToken,true),/Secure/);
 await auth('logout',{},again.cookieToken);assert.equal(await authenticateAccount(again.cookieToken),null);await assert.rejects(()=>auth('account',{},again.cookieToken),/đăng nhập/);
});

test('coin purchases are atomic, owned skins never charge twice, and local unlock lists cannot bypass ownership',async()=>{
 clearMemory();const u=await user('Shopper');const {raw,value}=await accountDocument(u.identity);value.coins=1;await writeRecord(u.identity.key,raw,value);
 await assert.rejects(()=>auth('buySkin',{character:'bella-mu'},u.token),/chưa đủ/);
 const purchases=await Promise.allSettled([auth('buySkin',{character:'doctor'},u.token),auth('buySkin',{character:'chef'},u.token)]);assert.equal(purchases.filter(x=>x.status==='fulfilled').length,1);
 const account=(await auth('account',{},u.token)).account,skin=account.ownedSkins.find(id=>id!==DEFAULT_CHARACTER);assert.equal(account.coins,0);await auth('buySkin',{character:skin},u.token);assert.equal((await auth('account',{},u.token)).account.coins,0);
 await assert.rejects(()=>auth('equipSkin',{character:'bella-mu'},u.token),/chưa sở hữu/);await auth('equipSkin',{character:skin},u.token);
 const created=await roomCall(u.identity,{op:'create',name:'Spoof',character:'bella-mu',unlockedCharacters:['bella-mu']});assert.equal(created.room.players[0].name,'Shopper');assert.equal(created.room.players[0].character,skin);
 await assert.rejects(()=>roomCall(u.identity,{op:'unlock',character:'bella-mu',confirmed:true,code:created.room.code},created.token),/không được hỗ trợ/);
 await assert.rejects(()=>roomCall(u.identity,{op:'character',character:'bella-mu',code:created.room.code},created.token),/mở khóa/);
 await assert.rejects(()=>roomCall(null,{op:'create'}),/đăng nhập/);
 const other=await user('Another');await assert.rejects(()=>roomCall(other.identity,null,created.token,created.room.code),/tài khoản khác/);
});

test('a bot tournament credits its human champion only once across concurrent repeated result requests',async()=>{
 clearMemory();const u=await user('Champion'),created=await roomCall(u.identity,{op:'create',withBot:true});const code=created.room.code;
 await roomCall(u.identity,{op:'ready',ready:true,code},created.token);await roomCall(u.identity,{op:'start',code},created.token);
 const {room,raw}=await readRoom(code);room.status='finished';room.players.forEach(p=>p.rank=p.id===created.room.me?1:2);room.hand.stage='complete';await writeRoom(code,raw,room);
 await Promise.all(Array.from({length:5},()=>rewardFinishedTournament(code)));assert.equal((await auth('account',{},u.token)).account.coins,1);
 const final=await rewardFinishedTournament(code);assert.equal(final.coinReward.amount,1);assert.ok(!JSON.stringify((await roomCall(u.identity,null,created.token,code)).room).includes('accountKey'));
 const second=await roomCall(u.identity,{op:'create'}),record=await readRoom(second.room.code);record.room.status='finished';record.room.players[0].rank=1;await writeRoom(second.room.code,record.raw,record.room);await rewardFinishedTournament(second.room.code);assert.equal((await auth('account',{},u.token)).account.coins,1);
 assert.equal(CHARACTERS.find(c=>c.id==='bella-mu').price,6);assert.ok(CHARACTERS.filter(c=>c.locked&&c.id!=='bella-spider').every(c=>c.price>=4&&c.price<=6));assert.equal(CHARACTERS.find(c=>c.id==='bella-spider').price,10);assert.ok(CHARACTERS.slice(0,6).every(c=>c.price===1));
});
