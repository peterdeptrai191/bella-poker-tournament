import {service as roomService} from '../lib/service.js';
import {readRecord,writeRecord} from '../lib/store.js';
import {CHARACTERS,DEFAULT_CHARACTER} from '../public/characters.js';
const tokens=new Map();
// Trusted identities for existing room-engine tests; real authentication is
// exercised separately through accountRequest and the HTTP handler.
export async function service(args){
 if(args.code==='health')return roomService(args);
 let account=tokens.get(args.token);
 if(['create','join'].includes(args.body?.op)){
  const username=args.body.name||'Fixture',key='test-account:'+username;account={id:key,key,username};
  const record=await readRecord(key);if(!record.value)await writeRecord(key,null,{id:key,username,coins:0,ownedSkins:CHARACTERS.map(c=>c.id),equippedSkin:args.body.character||DEFAULT_CHARACTER,claims:{}});
 }
 const result=await roomService({...args,account:account||{id:'unknown',username:'Unknown',key:'test-account:unknown'}});
 if(result.token)tokens.set(result.token,account);return result;
}
