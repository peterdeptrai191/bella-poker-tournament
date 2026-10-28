import {GameError} from './poker.js';
const memory=new Map(),rates=new Map();
const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
export const storageMode=()=>url&&token?'redis':process.env.VERCEL?'unconfigured':'local';
async function command(args){const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(8000)});if(!response.ok)throw new GameError('Kho dữ liệu đang không phản hồi. Vui lòng thử lại.',503);const data=await response.json();if(data.error)throw new GameError('Không thể đồng bộ phòng chơi.',503);return data.result;}
function requireStorage(){if(storageMode()==='unconfigured')throw new GameError('Chưa cấu hình kho dữ liệu online. Chủ app cần thêm UPSTASH_REDIS_REST_URL và UPSTASH_REDIS_REST_TOKEN trên Vercel.',503);}
const key=code=>`bella:room:${code}`;
export async function readRoom(code){requireStorage();const raw=storageMode()==='redis'?await command(['GET',key(code)]):memory.get(code)||null;return {raw,room:raw?JSON.parse(raw):null};}
export async function writeRoom(code,before,room){requireStorage();const json=JSON.stringify(room);if(storageMode()==='redis'){const script="local previous=redis.call('GET',KEYS[1]); if (ARGV[1]=='__NEW__' and previous==false) or previous==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2],'EX',604800); return 1 else return 0 end";return (await command(['EVAL',script,1,key(code),before??'__NEW__',json]))===1;}
 const current=memory.get(code)||null;if(current!==before)return false;memory.set(code,json);return true;}
export async function limit(keyName,max){requireStorage();const window=Math.floor(Date.now()/60000),k=`bella:limit:${keyName}:${window}`;if(storageMode()==='redis'){const n=await command(['EVAL',"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],70) end; return n",1,k]);if(n>max)throw new GameError('Bạn thao tác quá nhanh. Thử lại sau một phút.',429);}else{for(const [key,v] of rates)if(v.expires<Date.now())rates.delete(key);const v=rates.get(k)||{count:0,expires:Date.now()+70000};v.count++;rates.set(k,v);if(v.count>max)throw new GameError('Thao tác quá nhanh.',429);}}
export function clearMemory(){memory.clear();rates.clear();}
