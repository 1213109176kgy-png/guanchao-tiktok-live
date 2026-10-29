import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const require=createRequire(import.meta.url),root=resolve(import.meta.dirname,'..');process.chdir(root);
const {_electron}=createRequire(require.resolve('@playwright/cli/package.json'))('playwright');
const dataDir=mkdtempSync(join(tmpdir(),'guanchao-desktop-qa-'));
// Synthetic records are injected only into this isolated test database.
execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',`import {Store} from './server/store.ts';import {demoProfiles,demoPayload} from './server/demo.ts';import {normalizeEvent} from './server/normalize.ts';const store=new Store(process.argv[1]);const task=store.createTask('qa_fixture','live');demoProfiles.forEach((_,i)=>store.ingest(task.id,normalizeEvent(i%4===0?'gift':'chat',demoPayload(i,i,i%4===0?'gift':'chat','desktop-fixture'))));store.close();`,join(dataDir,'audience.sqlite')]);
const output=resolve('output/desktop');mkdirSync(output,{recursive:true});
const packaged=process.env.PACKAGED_EXE;
const executablePath=packaged?resolve(packaged):require('electron');
const env={...process.env,GUANCHAO_DATA_DIR:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const checks=[],errors=[],requests=[];
let instance;
async function launch(){
  const app=await _electron.launch({executablePath,args:packaged?[]:[root],env,timeout:45000});
  let page;for(let i=0;i<200;i++){page=app.windows().find(p=>p.url().startsWith('file:'));if(page)break;await new Promise(r=>setTimeout(r,100));}if(!page){await app.close();throw new Error('Local app window not found');}page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().includes('/api/'))requests.push(request.url());});
  await page.getByRole('region',{name:'TikTok 内嵌浏览器'}).waitFor();await page.getByRole('button',{name:'观众工作台',exact:true}).click();return {app,page};
}
function pass(message){checks.push(message);console.log('PASS '+message);}
try{
  instance=await launch();let {app,page}=instance;
  assert.equal(new URL(page.url()).protocol,'file:');assert.equal(await page.evaluate(()=>typeof window.desktop?.request),'function');pass('EXE 内置本地界面和 IPC，无网页服务');
  const runtime=await app.evaluate(()=>({node:process.versions.node,electron:process.versions.electron,pid:process.pid}));
  for(const label of ['观众工作台','直播间管理','实时互动','运行设置']){await page.getByRole('button',{name:label,exact:true}).click();assert.equal(await page.getByText(/体验演示|先体验演示|演示数据|演示空间|演示模式|演示账号|合成演示/).count(),0);assert.equal(await page.getByRole('button',{name:'真实采集',exact:true}).count(),0);}await page.getByRole('button',{name:'观众工作台',exact:true}).click();pass('所有模块均无演示入口和模式切换');
  await page.getByRole('heading',{name:'观众名单 32',exact:true}).waitFor();pass('真实数据通道读取隔离测试库的 32 位观众');
  await page.getByRole('button').filter({hasText:'直播间管理'}).first().click();await page.getByText('@qa_fixture',{exact:true}).waitFor();
  await page.getByRole('button',{name:'观众工作台',exact:true}).click();
  await page.getByRole('button',{name:'等级 ≥ 20',exact:true}).click();await page.getByRole('heading',{name:'观众名单 14',exact:true}).waitFor();pass('等级筛选返回预期 14 位观众');
  await page.getByRole('button',{name:'全部观众',exact:true}).click();
  await page.getByRole('textbox',{name:'搜索观众'}).fill('demo_viewer_01');await page.getByRole('heading',{name:'观众名单 1',exact:true}).waitFor();
  await page.getByRole('button',{name:'查看',exact:true}).click();
  let detail=page.getByRole('dialog',{name:'观众详情'});
  await detail.getByLabel('跟进备注').fill('Windows 打包持久化验证');await detail.getByLabel('跟进状态',{exact:true}).selectOption('interested');
  await detail.getByRole('button',{name:'保存跟进'}).click();await page.getByRole('status').filter({hasText:'跟进记录已保存'}).waitFor();
  await page.screenshot({path:join(output,'desktop-detail.png')});await detail.getByRole('button',{name:'关闭',exact:true}).click();pass('桌面详情与跟进保存');
  const csvPath=join(output,'desktop-export.csv');
  await app.evaluate(({dialog},filePath)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath});},csvPath);
  await page.getByRole('button',{name:'导出 CSV',exact:true}).click();await page.getByRole('status').filter({hasText:'观众名单已保存'}).waitFor();
  const csv=readFileSync(csvPath,'utf8');assert.ok(csv.includes('Windows 打包持久化验证'));assert.ok(csv.includes('Mia Chen'));pass('原生保存处理器导出真实 CSV 文件（对话框选择以测试桩指定）');
  await page.getByRole('button',{name:'运行设置',exact:true}).click();
  await page.getByLabel('网络代理（可选）').fill('http://127.0.0.1:7890');
  const encryption=await app.evaluate(({safeStorage})=>safeStorage.isEncryptionAvailable());
  if(encryption)await page.getByLabel('Euler Stream 签名密钥（可选）').fill('qa-placeholder-not-a-real-api-key');
  await page.getByRole('button',{name:'保存采集设置'}).click();await page.getByRole('status').filter({hasText:'配置已保存'}).waitFor();
  const saved=readFileSync(join(dataDir,'settings.json'),'utf8');assert.ok(!saved.includes('qa-placeholder-not-a-real-api-key'));assert.ok(saved.includes('127.0.0.1'));pass('桌面配置保存；密钥不以明文落盘');
  await page.screenshot({path:join(output,'desktop-settings.png')});
  await app.close();instance=await launch();({app,page}=instance);
  await page.getByRole('textbox',{name:'搜索观众'}).fill('demo_viewer_01');await page.getByRole('heading',{name:'观众名单 1',exact:true}).waitFor();
  await page.getByRole('button',{name:'查看',exact:true}).click();detail=page.getByRole('dialog',{name:'观众详情'});
  assert.equal(await detail.getByLabel('跟进备注').inputValue(),'Windows 打包持久化验证');assert.equal(await detail.getByLabel('跟进状态',{exact:true}).inputValue(),'interested');pass('退出 EXE 再启动，观众与备注仍然存在');
  await detail.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('button',{name:'运行设置',exact:true}).click();await page.getByLabel('网络代理（可选）').waitFor();
  assert.equal(await page.getByLabel('网络代理（可选）').inputValue(),'http://127.0.0.1:7890');
  if(encryption){assert.equal(await page.getByLabel('Euler Stream 签名密钥（可选）').getAttribute('placeholder'),'已配置，留空保留现有密钥');await page.getByLabel('清除已保存的签名密钥').check();}
  await page.getByLabel('网络代理（可选）').fill('');await page.getByRole('button',{name:'保存采集设置'}).click();await page.getByRole('status').filter({hasText:'配置已保存'}).waitFor();pass('重启后配置恢复，代理与密钥可以清除');
  await page.getByRole('button',{name:'观众工作台',exact:true}).click();await page.getByRole('button',{name:'清空搜索'}).click();
  await page.getByRole('heading',{name:'观众名单 32',exact:true}).waitFor();await page.getByRole('status').waitFor({state:'hidden'});
  await page.screenshot({path:join(output,'desktop-main.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);pass('界面无 JavaScript 异常，未产生 HTTP API 请求');
  writeFileSync(join(output,'desktop-report.json'),JSON.stringify({packaged:Boolean(packaged),runtime,checks,encryptionAvailable:encryption,apiRequests:requests,errors,dataDir},null,2));
  console.log('PASS '+checks.length+' desktop checks.');
}finally{await instance?.app.close().catch(()=>{});}
