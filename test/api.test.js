import test from 'node:test';import assert from 'node:assert/strict';import handler from '../api/index.js';
import {clearMemory} from '../lib/store.js';
function response(){return {headers:{},statusCode:0,setHeader(key,value){this.headers[key]=value;},end(body){this.body=JSON.parse(body);}};}
test('HTTP handler rejects unsupported methods',async()=>{const res=response();await handler({method:'DELETE',headers:{host:'localhost'},url:'/api'},res);assert.equal(res.statusCode,405);assert.equal(res.headers.Allow,'GET, POST');});
test('HTTP handler rejects cross-origin mutations',async()=>{const res=response();await handler({method:'POST',headers:{host:'localhost',origin:'https://other.example'},url:'/api',body:{op:'create',name:'User'}},res);assert.equal(res.statusCode,403);});
test('HTTP handler exposes health without credentials and prevents caching',async()=>{const res=response();await handler({method:'GET',headers:{host:'localhost'},url:'/api?code=health'},res);assert.equal(res.statusCode,200);assert.equal(res.body.ok,true);assert.equal(res.headers['Cache-Control'],'no-store, private');});

test('HTTP registration issues a private cookie, restores wallet without another gift and gates all game access',async()=>{
 clearMemory();const send=async(body,cookie='',url='/api')=>{const res=response();await handler({method:body?'POST':'GET',headers:{host:'localhost',cookie},url,body},res);return res;};
 const denied=await send({op:'create',name:'Guest'});assert.equal(denied.statusCode,401);
 const registered=await send({op:'register',username:'HTTP Player',password:'example-password'});assert.equal(registered.statusCode,200);assert.match(registered.headers['Set-Cookie'],/HttpOnly/);assert.ok(!registered.body.cookieToken);assert.equal(registered.body.account.coins,0);
 const cookie=registered.headers['Set-Cookie'].split(';')[0],profile=await send(null,cookie,'/api?code=account');assert.equal(profile.statusCode,200);assert.equal(profile.body.account.coins,0);assert.equal(profile.body.account.equippedSkin,'farmer');
 const created=await send({op:'create',name:'Ignored'},cookie);assert.equal(created.statusCode,200);assert.equal(created.body.room.players[0].name,'HTTP Player');
 await send({op:'logout'},cookie);assert.equal((await send(null,cookie,'/api?code=account')).statusCode,401);
});

test('a table poll reads only the session and the room, in one combined read, and sends no account',async()=>{
 clearMemory();const send=async(body,cookie='',url='/api',auth='')=>{const res=response();await handler({method:body?'POST':'GET',headers:{host:'localhost',cookie,...(auth?{authorization:'Bearer '+auth}:{})},url,body},res);return res;};
 const registered=await send({op:'register',username:'Poll Player',password:'example-password'});const cookie=registered.headers['Set-Cookie'].split(';')[0];
 const created=await send({op:'create',withBot:true,requestId:'create-poll-1'},cookie);const code=created.body.room.code,token=created.body.token;
 const poll=await send(null,cookie,'/api?code='+code,token);assert.equal(poll.statusCode,200);assert.equal(poll.body.room.code,code);assert.equal(poll.body.account,undefined);
 assert.equal((await send(null,'','/api?code='+code,token)).statusCode,401);                       // no login cookie
 assert.equal((await send(null,'bella_session=bad','/api?code='+code,token)).statusCode,401);       // bad cookie
 const synced=await send({op:'sync',code,requestId:'sync-poll-1'},cookie,'/api',token);assert.equal(synced.statusCode,200);assert.equal(synced.body.account.username,'Poll Player');
});
