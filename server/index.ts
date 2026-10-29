import 'dotenv/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Store } from './store.ts';
import { createApplication } from './app.ts';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const store=new Store(process.env.DB_PATH??resolve(root,'data/audience.sqlite'));
const {app,close}=createApplication(store);
const production=process.argv.includes('--production');
let vite:import('vite').ViteDevServer|undefined;
if(production) {
  app.use(express.static(resolve(root,'dist')));
  app.get('/{*path}',(_req,res)=>res.sendFile(resolve(root,'dist/index.html')));
} else {
  const {createServer}=await import('vite');
  vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);
}
const port=Number(process.env.PORT??3180);
const server=app.listen(port,'127.0.0.1',()=>console.log(`观潮已启动：http://127.0.0.1:${port} (${production?'production':'development'})`));
server.on('error',(error)=>{console.error('服务启动失败：',error.message);process.exit(1);});
let exiting=false;
async function shutdown(){if(exiting)return;exiting=true;await close();await vite?.close();server.close();store.close();process.exit(0);}
process.on('SIGINT',()=>void shutdown());process.on('SIGTERM',()=>void shutdown());
