import express, { type Request, type Response, type NextFunction } from 'express';
import { Store } from './store.ts';
import { AudienceService } from './service.ts';
import { safeError } from './collector.ts';

export function createApplication(store:Store) {
  const app=express(),service=new AudienceService(store);app.disable('x-powered-by');
  app.use((req,res,next)=>{
    const host=req.headers.host??'';
    if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host))return res.status(403).json({error:'本地应用仅接受 localhost 访问'});
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','SAMEORIGIN');
    if(req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control','no-store');const origin=req.headers.origin;
      if(origin&&origin!==`http://${host}`)return res.status(403).json({error:'不允许其他网站访问本地数据'});
      if(!['GET','HEAD'].includes(req.method)&&!req.is('application/json'))return res.status(415).json({error:'请求需要 JSON 格式'});
    }next();
  });
  app.use(express.json({limit:'32kb'}));
  app.get('/api/updates',(req,res)=>{
    res.setHeader('Content-Type','text/event-stream');res.setHeader('Connection','keep-alive');res.flushHeaders();
    const send=()=>res.write('event: change\ndata: {}\n\n');send();service.on('change',send);
    const heartbeat=setInterval(()=>res.write(': heartbeat\n\n'),20000);
    req.on('close',()=>{clearInterval(heartbeat);service.off('change',send);});
  });
  app.use('/api',async(req,res)=>{
    const result=await service.request(req.method,req.originalUrl,req.body);
    if(result.headers)res.set(result.headers);res.status(result.status);
    if(typeof result.body==='string')res.send(result.body);else res.json(result.body);
  });
  app.use((err:Error,_req:Request,res:Response,_next:NextFunction)=>{if(res.headersSent){res.end();return;}res.status(400).json({error:safeError(err)});});
  return {app,collector:service.collector,close:()=>service.close()};
}
