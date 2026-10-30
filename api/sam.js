import {authenticateAccount,cookieToken} from '../lib/accounts.js';
import {demand} from '../lib/poker.js';
import {samRequest} from '../lib/sam/service.js';
export default async function samHandler(req,res){res.setHeader('Cache-Control','no-store, private');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');try{
 demand(req.method==='POST','Dùng POST cho Sâm lốc.',405);if(req.headers.origin)demand(new URL(req.headers.origin).host===req.headers.host,'Nguồn gửi không hợp lệ.',403);let body=req.body||{};if(typeof body==='string'){demand(Buffer.byteLength(body)<=8192,'Yêu cầu quá lớn.',413);body=JSON.parse(body);}demand(Buffer.byteLength(JSON.stringify(body))<=8192,'Yêu cầu quá lớn.',413);
 const identity=await authenticateAccount(cookieToken(req.headers.cookie));res.end(JSON.stringify(await samRequest({identity,body})));
 }catch(e){res.statusCode=e.status||500;res.end(JSON.stringify({error:e.status?e.message:'Sâm lốc đang gặp lỗi, hãy thử lại cùng thao tác.'}));if(!e.status)console.error('Sam request failed:',e.name);}}
