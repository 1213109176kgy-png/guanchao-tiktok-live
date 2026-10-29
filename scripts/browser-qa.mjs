import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');process.chdir(root);
mkdirSync('output/playwright',{recursive:true});
const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));
const port=probe.address().port;await new Promise(r=>probe.close(r));
const dbPath=join(mkdtempSync(join(tmpdir(),'guanchao-web-qa-')),'audience.sqlite');
const seeded=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',`import {Store} from './server/store.ts';import {demoProfiles,demoPayload} from './server/demo.ts';import {normalizeEvent} from './server/normalize.ts';const store=new Store(process.argv[1]);const task=store.createTask('qa_fixture','live');demoProfiles.forEach((_,i)=>store.ingest(task.id,normalizeEvent('chat',demoPayload(i,i,'chat','web-fixture'))));store.close();`,dbPath],{encoding:'utf8',windowsHide:true});if(seeded.status!==0)throw new Error(seeded.stderr);
const server=spawn(process.execPath,['--import','tsx','server/index.ts','--production'],{
  env:{...process.env,PORT:String(port),DB_PATH:dbPath},stdio:['ignore','pipe','pipe'],windowsHide:true,
});
let serverLog='';server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
const cli=resolve(root,'node_modules/@playwright/cli/playwright-cli.js');
function run(args){const r=spawnSync(process.execPath,[cli,'-s=audience-qa',...args],{encoding:'utf8',timeout:90000,windowsHide:true});
  const out=(r.stdout??'')+(r.stderr??'');if(r.error||r.status!==0||out.includes('### Error'))throw new Error(out||String(r.error));return out;}
try{
  let ready=false;
  for(let i=0;i<50;i++){try{const res=await fetch(`http://127.0.0.1:${port}/api/health`);if(res.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
  if(!ready)throw new Error('QA server failed to start: '+serverLog);
  run(['open',`http://127.0.0.1:${port}`,'--browser=chrome']);
  const out=run(['run-code','--filename=tests/browser-smoke.js']);writeFileSync('output/playwright/browser-report.txt',out);
  const start=out.indexOf('### Result'),end=out.indexOf('### Ran');
  const report=out.slice(start,end>start?end:undefined);console.log(report||out.slice(-3000));
  if(!out.includes('送礼等级 >=20'))throw new Error('No successful browser check report returned');
}finally{
  try{run(['close']);}catch{}
  server.kill();
}
