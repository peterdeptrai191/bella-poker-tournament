import {service} from '../lib/service.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, private');res.setHeader('Content-Type','application/json; charset=utf-8');
 if(!['GET','POST'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, POST');res.end(JSON.stringify({error:'Phương thức không được hỗ trợ.'}));return;}
 try{if(req.method==='POST'){const origin=req.headers.origin,host=req.headers.host;if(origin&&new URL(origin).host!==host){res.statusCode=403;res.end(JSON.stringify({error:'Nguồn gửi không hợp lệ.'}));return;}}
  let body=req.body||{};if(typeof body==='string'){if(Buffer.byteLength(body)>8192)throw Object.assign(new Error('Yêu cầu quá lớn.'),{status:413});body=JSON.parse(body);}if(Buffer.byteLength(JSON.stringify(body))>8192)throw Object.assign(new Error('Yêu cầu quá lớn.'),{status:413});
  const url=new URL(req.url,`http://${req.headers.host}`);const code=url.searchParams.get('code');const token=String(req.headers.authorization||'').replace(/^Bearer /,'');const ip=String(req.headers['x-forwarded-for']||'local').split(',')[0].trim();
  const result=await service({method:req.method,body,code,token,ip});res.statusCode=200;res.end(JSON.stringify(result));
 }catch(error){res.statusCode=error.status||500;res.end(JSON.stringify({error:error.status?error.message:'Có lỗi máy chủ. Vui lòng thử lại.'}));if(!error.status)console.error('Request failed:',error.name);}
}
