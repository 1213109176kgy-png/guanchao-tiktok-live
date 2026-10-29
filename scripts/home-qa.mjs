import {createRequire} from 'node:module';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{_electron}=createRequire(require.resolve('@playwright/cli/package.json'))('playwright');
const root=resolve(import.meta.dirname,'..'),dataDir=mkdtempSync(join(tmpdir(),'guanchao-home-qa-')),output=join(root,'output/home');mkdirSync(output,{recursive:true});
const env={...process.env,GUANCHAO_DATA_DIR:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const app=await _electron.launch({executablePath:process.env.PACKAGED_EXE||require('electron'),args:process.env.PACKAGED_EXE?[]:[root],env,timeout:45000});
const checks=[];const pass=m=>{checks.push(m);console.log('PASS '+m);};
try{
  let page;for(let i=0;i<200;i++){page=app.windows().find(p=>p.url().startsWith('file:'));if(page)break;await new Promise(r=>setTimeout(r,100));}assert.ok(page);
  await page.getByRole('region',{name:'TikTok 内嵌浏览器'}).waitFor();pass('桌面默认进入新增首页');
  await app.evaluate(async({session,webContents})=>{
    const ses=session.fromPartition('persist:tiktok-browser');
    await ses.protocol.handle('https',request=>{
      const url=new URL(request.url),match=url.pathname.match(/^\/@([\w.]+)\/live/),host=match?.[1];
      const status=host==='offline_host'?4:2;
      const metadata=host?{LiveRoom:{liveRoomUserInfo:{user:{uniqueId:host},liveRoom:{id:'7654321000000000001',status}}}}:{};
      return new Response(`<!doctype html><html><head><title>TikTok 测试页面</title></head><body style="font:18px sans-serif;background:#111;color:#eee;padding:40px"><h1>${host?'@'+host+' · LIVE':'TikTok 受控测试页面'}</h1><p>用于验证浏览、识别与隔离，不是真实直播。</p><a style="color:#a9d682" href="/@qa_host/live">进入直播间</a><script id="SIGI_STATE" type="application/json">${JSON.stringify(metadata)}</script></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8'}});
    });
    const remote=webContents.getAllWebContents().find(w=>w.getURL().startsWith('https://'));
    if(remote){remote.stop();await remote.loadURL('https://www.tiktok.com/');}
  });
  await page.waitForFunction(()=>window.desktop.browserState().then(s=>!s.loading&&s.kind==='browsing'));assert.equal(await page.locator('.room-detection').count(),0);pass('普通网页不误显示可采集直播间');
  await page.getByRole('textbox',{name:'TikTok 网页地址'}).fill('https://www.tiktok.com/@qa_host/live');
  await page.getByRole('button',{name:'打开 TikTok 地址'}).click();
  await page.getByRole('button',{name:'采集此直播间',exact:true}).waitFor();
  await page.waitForFunction(()=>window.desktop.browserState().then(s=>s.kind==='live'&&s.host==='qa_host'));
  assert.equal(await page.getByRole('button',{name:'采集此直播间',exact:true}).isEnabled(),true);pass('真实原生网页视图的元数据触发直播识别和采集按钮');
  const isolation=await app.evaluate(async({webContents})=>{const remote=webContents.getAllWebContents().find(w=>w.getURL().includes('/@qa_host/live'));return remote.executeJavaScript('({bridge:typeof window.desktop,node:typeof require,location:location.href})');});
  assert.equal(isolation.bridge,'undefined');assert.equal(isolation.node,'undefined');pass('TikTok 页面无法访问桌面业务桥或 Node');
  const visible=()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].contentView.children.some(v=>v.getVisible()));
  await page.waitForFunction(()=>window.desktop.browserState().then(s=>!s.loading));
  assert.equal(await visible(),true);
  await page.getByRole('button',{name:'查看使用指南'}).click();await page.getByRole('dialog',{name:'开始使用观潮'}).waitFor();
  await new Promise(r=>setTimeout(r,150));assert.equal(await visible(),false);await page.getByRole('button',{name:'知道了'}).click();pass('本地弹窗显示时隐藏原生网页，避免遮挡');
  await page.getByRole('button',{name:'观众工作台',exact:true}).click();await new Promise(r=>setTimeout(r,150));assert.equal(await visible(),false);
  await page.getByRole('button',{name:'首页',exact:true}).click();await page.getByRole('button',{name:'采集此直播间',exact:true}).waitFor();
  const state=await page.evaluate(()=>window.desktop.browserState());assert.equal(state.host,'qa_host');pass('切换模块保留当前直播页');
  await page.getByRole('textbox',{name:'TikTok 网页地址'}).fill('https://www.tiktok.com/@offline_host/live');await page.getByRole('button',{name:'打开 TikTok 地址'}).click();
  await page.getByText('主播未开播',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'采集此直播间',exact:true}).isDisabled(),true);pass('明确下播状态禁止添加');
  await page.getByRole('textbox',{name:'TikTok 网页地址'}).fill('https://www.tiktok.com/@qa_host/live');await page.getByRole('button',{name:'打开 TikTok 地址'}).click();await page.getByRole('button',{name:'采集此直播间',exact:true}).waitFor();
  await app.evaluate(async({session})=>{const ses=session.fromPartition('persist:tiktok-browser');await ses.cookies.set({url:'https://www.tiktok.com',name:'guanchao_qa_marker',value:'fixture-only',expirationDate:Date.now()/1000+3600});await ses.cookies.flushStore();});
  assert.equal(await page.locator('.topbar,.page-heading,.browser-top,.browser-bottom').count(),0);const viewportHeight=await page.evaluate(()=>innerHeight);const bounds=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].contentView.children.map(v=>v.getBounds()));assert.ok(bounds.some(b=>b.width>500&&b.height>viewportHeight-130));pass('内嵌视图具有独立且有效的浏览区域');
  await page.screenshot({path:join(output,'home-toolbar-fixture.png')});
  const screenshot=await app.evaluate(async({webContents})=>{const web=webContents.getAllWebContents().find(w=>w.getURL().includes('/@qa_host/live'));const image=await web.capturePage();return image.toPNG().toString('base64');});writeFileSync(join(output,'embedded-fixture.png'),Buffer.from(screenshot,'base64'));
  await app.close();const restarted=await _electron.launch({executablePath:process.env.PACKAGED_EXE||require('electron'),args:process.env.PACKAGED_EXE?[]:[root],env,timeout:45000});try{let local;for(let i=0;i<200;i++){local=restarted.windows().find(p=>p.url().startsWith('file:'));if(local)break;await new Promise(r=>setTimeout(r,100));}await local.getByRole('region',{name:'TikTok 内嵌浏览器'}).waitFor();const cookies=await restarted.evaluate(async({session})=>session.fromPartition('persist:tiktok-browser').cookies.get({name:'guanchao_qa_marker'}));assert.equal(cookies[0]?.value,'fixture-only');pass('独立浏览会话在退出重开后保留');}finally{await restarted.close();}
  writeFileSync(join(output,'home-report.json'),JSON.stringify({checks,dataDir,network:'controlled HTTPS fixtures, no real login or live connection'},null,2));
}finally{await app.close().catch(()=>{});}
