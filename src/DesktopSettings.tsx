import { useEffect, useState } from 'react';
import { FolderOpen, Save, Settings2 } from 'lucide-react';
import type { DesktopConfig } from '../shared/desktop.ts';
export default function DesktopSettings({onSaved}:{onSaved:()=>void}){
  const [config,setConfig]=useState<DesktopConfig|null>(null),[proxy,setProxy]=useState(''),[key,setKey]=useState(''),[clearKey,setClearKey]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{void window.desktop!.config().then(c=>{setConfig(c);setProxy(c.proxy);}).catch(e=>setError(e.message));},[]);
  async function save(){setBusy(true);setError('');setMessage('');try{
    const c=await window.desktop!.saveConfig({proxy,signingKey:key||undefined,clearSigningKey:clearKey});setConfig(c);setKey('');setClearKey(false);setMessage('配置已保存，下次连接立即生效。');onSaved();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <article className="settings-card desktop-config"><h2><Settings2 size={19}/>桌面采集设置</h2><p className="settings-description">无需编辑配置文件。普通公共直播可先使用社区签名额度。</p>
    <label className="form-label" htmlFor="desktop-proxy">网络代理（可选）</label><input id="desktop-proxy" className="form-input" placeholder="例如 http://127.0.0.1:7890" value={proxy} maxLength={500} onChange={e=>setProxy(e.target.value)}/><p className="field-note">用于 TikTok 网页和直播采集的网络访问。需要代理时填写本机 HTTP/HTTPS 代理地址，留空则直接连接。</p>
    <label className="form-label" htmlFor="desktop-key">Euler Stream 签名密钥（可选）</label><input id="desktop-key" className="form-input" type="password" autoComplete="off" placeholder={config?.signingKeyConfigured?'已配置，留空保留现有密钥':'未配置，使用社区额度'} value={key} maxLength={4096} onChange={e=>setKey(e.target.value)}/><p className="field-note">密钥通过 Windows 加密后保存，不会在页面回显。</p>
    {config?.signingKeyConfigured&&<label className="checkbox-label"><input type="checkbox" checked={clearKey} onChange={e=>setClearKey(e.target.checked)}/>清除已保存的签名密钥</label>}
    {error&&<div className="form-error" role="alert">{error}</div>}{message&&<p className="settings-success" role="status">{message}</p>}
    <div className="desktop-config-actions"><button className="button primary" disabled={busy||!config} onClick={()=>void save()}><Save size={15}/>{busy?'保存中…':'保存采集设置'}</button><button className="button" onClick={()=>void window.desktop!.openDataFolder().catch(e=>setError(e.message))}><FolderOpen size={15}/>打开数据文件夹</button></div>
    <p className="data-folder">{config?.dataFolder??'正在读取数据目录…'}</p>
  </article>;
}
