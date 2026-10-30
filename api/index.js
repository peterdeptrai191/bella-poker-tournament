import {accountRequest,authenticateAccount,cookieToken,cookieHeader} from '../lib/accounts.js';
import {service} from '../lib/service.js';
import {adminRequest} from '../lib/admin.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(!['GET','POST'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, POST');res.end(JSON.stringify({error:'Phương thức không được hỗ trợ.'}));return;}
 try{if(req.method==='POST'){const origin=req.headers.origin,host=req.headers.host;if(origin&&new URL(origin).host!==host){res.statusCode=403;res.end(JSON.stringify({error:'Nguồn gửi không hợp lệ.'}));return;}}
  let body=req.body||{};if(typeof body==='string'){if(Buffer.byteLength(body)>8192)throw Object.assign(new Error('Yêu cầu quá lớn.'),{status:413});body=JSON.parse(body);}if(Buffer.byteLength(JSON.stringify(body))>8192)throw Object.assign(new Error('Yêu cầu quá lớn.'),{status:413});
  const url=new URL(req.url,`http://${req.headers.host}`);const code=url.searchParams.get('code');const token=String(req.headers.authorization||'').replace(/^Bearer /,'');const ip=String(req.headers['x-forwarded-for']||'local').split(',')[0].trim();
  const accountToken=cookieToken(req.headers.cookie);let result;
  if(typeof body.op==='string'&&body.op.startsWith('admin')){
   if(req.method!=='POST')throw Object.assign(new Error('Dùng POST cho quản trị.'),{status:405});
   result=await adminRequest({body,identity:await authenticateAccount(accountToken)});
  }else if(['register','login','logout','buySkin','buyRandomSkin','openCr7Pack','seeCr7Event','equipSkin','buyCardSkin','equipCardSkin','claimDaily','equipChipSkin','renameAccount','setDisplayName'].includes(body.op)||req.method==='GET'&&code==='account'){
   if(req.method==='GET')body={op:'account'};
   result=await accountRequest({body,token:accountToken,ip});
   if(Object.hasOwn(result,'cookieToken')){res.setHeader('Set-Cookie',cookieHeader(result.cookieToken,process.env.VERCEL==='1'||req.headers['x-forwarded-proto']==='https'));delete result.cookieToken;}
  }else result=await service({method:req.method,body,code,token,ip,account:code==='health'?null:await authenticateAccount(accountToken)});res.statusCode=200;res.end(JSON.stringify(result));
 }catch(error){res.statusCode=error.status||500;res.end(JSON.stringify({error:error.status?error.message:'Có lỗi máy chủ. Vui lòng thử lại.'}));if(!error.status)console.error('Request failed:',error.name);}
}
