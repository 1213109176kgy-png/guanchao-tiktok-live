async (page) => {
  const report=[];
  const check=(ok,message)=>{if(!ok)throw new Error(message);report.push(message);};
  await page.goto(page.url());
  check(await page.getByRole('button',{name:'体验演示',exact:true}).count()===0,'没有演示入口');
  await page.getByRole('heading',{name:'观众名单 32',exact:true}).waitFor();
  await page.setViewportSize({width:1440,height:1050});
  await page.getByRole('button').filter({hasText:'直播间管理'}).first().click();
  const stop=page.getByRole('button',{name:'停止',exact:true});
  if(await stop.count())await stop.click();
  await page.getByRole('button',{name:'观众工作台',exact:true}).click();
  await Promise.all([page.waitForResponse(r=>r.url().includes('/api/audience?')&&r.url().includes('minLevel=20')),
    page.getByRole('button',{name:'等级 ≥ 20',exact:true}).click()]);
  await page.getByRole('heading',{name:'观众名单 14',exact:true}).waitFor();
  check(await page.locator('tbody tr').count()===14,'送礼等级 >=20 筛选得到 14 位合成观众');
  const values=await page.locator('tbody tr td:nth-child(2)').allTextContents();
  check(values.every(v=>Number(v.match(/Lv\.(\d+)/)?.[1])>=20),'筛选结果全部满足等级阈值');
  await Promise.all([page.waitForResponse(r=>r.url().includes('/api/audience?')&&r.url().includes('levelState=unknown')),
    page.getByRole('button',{name:'等级未知',exact:true}).click()]);
  await page.getByRole('heading',{name:'观众名单 8',exact:true}).waitFor();
  check(await page.locator('tbody tr').count()===8,'未知等级保持未知，共 8 位');
  await page.getByRole('button',{name:'全部观众',exact:true}).click();
  await page.getByRole('textbox',{name:'搜索观众',exact:true}).fill('demo_viewer_01');
  await page.waitForResponse(r=>r.url().includes('/api/audience?')&&r.url().includes('search=demo_viewer_01'));
  await page.getByRole('heading',{name:'观众名单 1',exact:true}).waitFor();
  check(await page.locator('tbody tr').count()===1,'按 TikTok 账号搜索正确');
  await page.getByRole('button',{name:'查看',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'观众详情'});
  await dialog.getByRole('textbox',{name:'跟进备注'}).fill('演示验证：询问新加坡配送，下次确认库存。');
  await dialog.getByLabel('跟进状态',{exact:true}).selectOption('interested');
  await dialog.getByRole('button',{name:'保存跟进',exact:true}).click();
  await page.getByRole('status').filter({hasText:'跟进记录已保存'}).waitFor();
  await page.screenshot({path:'output/playwright/audience-detail.png',fullPage:true});
  await dialog.getByRole('button',{name:'关闭',exact:true}).click();
  await page.getByRole('button',{name:'查看',exact:true}).click();
  check(await dialog.getByRole('textbox',{name:'跟进备注'}).inputValue()==='演示验证：询问新加坡配送，下次确认库存。','备注保存后重新打开仍存在');
  check(await dialog.getByLabel('跟进状态',{exact:true}).inputValue()==='interested','跟进状态持久化');

  await dialog.getByRole('button',{name:'关闭',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'导出 CSV',exact:true}).click();
  const download=await downloadPromise;await download.saveAs('output/playwright/audience-demo.csv');report.push('浏览器成功下载当前筛选的 CSV');
  await page.getByRole('button',{name:'清空搜索',exact:true}).click();
  await page.waitForResponse(r=>r.url().includes('/api/audience?')&&!r.url().includes('search='));
  await page.getByRole('button',{name:'下一页',exact:true}).click();
  await page.waitForResponse(r=>r.url().includes('/api/audience?')&&r.url().includes('page=2'));
  check(await page.locator('tbody tr').count()===15,'第二页显示 15 位观众');
  await page.getByRole('button',{name:'添加直播间',exact:true}).first().click();
  const form=page.getByRole('dialog',{name:'添加 TikTok 直播间'});
  await form.getByRole('textbox',{name:'主播账号或直播链接'}).fill('https://example.com/@someone');
  await form.getByRole('button',{name:'创建并开始采集'}).click();
  await form.getByRole('alert').waitFor();
  check((await form.getByRole('alert').textContent()).includes('tiktok.com'),'错误链接得到清晰提示');
  await page.screenshot({path:'output/playwright/invalid-host.png'});
  await form.getByRole('button',{name:'取消',exact:true}).click();

  await page.getByRole('button',{name:'等级 ≥ 20',exact:true}).click();
  await page.waitForResponse(r=>r.url().includes('/api/audience?')&&r.url().includes('minLevel=20'));
  await page.getByRole('status').waitFor({state:'hidden'});
  await page.screenshot({path:'output/playwright/demo-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'output/playwright/demo-mobile.png',fullPage:true});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'手机页面没有整页横向溢出（表格内部可横向滚动）');
  await page.setViewportSize({width:1440,height:1050});
  return {passed:report.length,checks:report};
}
