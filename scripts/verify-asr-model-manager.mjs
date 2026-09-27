import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const studioUrl=process.env.MOTION_STUDIO_URL??'http://127.0.0.1:4180/';
const chromePath=process.env.CHROME_PATH??'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const output=path.resolve('docs','verification');await mkdir(output,{recursive:true});
const freePort=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const address=server.address();if(!address||typeof address==='string')return reject(new Error('No debug port'));server.close(()=>resolve(address.port));});});
const debugPort=await freePort(),profile=await mkdtemp(path.join(os.tmpdir(),'motion-asr-ui-'));
const chrome=spawn(chromePath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'--window-size=1440,1000',studioUrl],{windowsHide:true,stdio:'ignore'});
try{
  let target;
  for(let attempt=0;attempt<80&&!target;attempt+=1){try{target=(await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(response=>response.json())).find(item=>item.type==='page');}catch{}if(!target)await new Promise(resolve=>setTimeout(resolve,100));}
  if(!target?.webSocketDebuggerUrl)throw new Error('Chrome page target unavailable');
  const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let nextId=0;const pending=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(String(event.data));if(!message.id)return;const callback=pending.get(message.id);if(!callback)return;pending.delete(message.id);message.error?callback.reject(new Error(message.error.message)):callback.resolve(message.result);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.text??'Browser evaluation failed');return result.result.value;};
  await send('Page.enable');await send('Runtime.enable');await new Promise(resolve=>setTimeout(resolve,1200));
  await evaluate(`([...document.querySelectorAll('.top-actions button')].find(button=>button.textContent.includes('设置'))).click()`);await new Promise(resolve=>setTimeout(resolve,300));
  const initial=await evaluate(`(()=>({dialog:Boolean(document.querySelector('.asr-settings')),models:[...document.querySelectorAll('.local-model-option')].map(item=>item.innerText),refresh:document.querySelector('.refresh-models')?.innerText||'',freeTextModelInputs:document.querySelectorAll('input[list="local-asr-models"]').length}))()`);
  await evaluate(`document.querySelector('.refresh-models').click()`);await new Promise(resolve=>setTimeout(resolve,300));
  const refreshed=await evaluate(`document.querySelectorAll('.local-model-option').length`);
  const confirmation=await evaluate(`(()=>{window.__motionAsrConfirmation='';window.confirm=message=>{window.__motionAsrConfirmation=message;return false;};const missing=[...document.querySelectorAll('.local-model-option')].find(item=>item.innerText.includes('未安装'));if(missing)missing.click();return window.__motionAsrConfirmation;})()`);
  const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(output,'asr-model-manager.png'),Buffer.from(image.data,'base64'));
  const missingCount=initial.models.filter(text=>text.includes('未安装')).length;
  const checks={dialog:initial.dialog,threeModels:initial.models.length===3,installedTurbo:initial.models.some(text=>text.includes('Large V3 Turbo')&&text.includes('已安装')),knownStatuses:initial.models.every(text=>['已安装','未安装','文件不完整','下载中','下载失败'].some(status=>text.includes(status))),refresh:initial.refresh.includes('刷新模型'),noFreeTextModelInput:initial.freeTextModelInputs===0,refreshKeptCatalog:refreshed===3,downloadConfirmation:missingCount===0||String(confirmation).includes('GB')};
  const failures=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name);console.log(JSON.stringify({initial,confirmation,checks,failures},null,2));socket.close();if(failures.length)process.exitCode=1;
}finally{chrome.kill();await new Promise(resolve=>setTimeout(resolve,200));await rm(profile,{recursive:true,force:true}).catch(()=>{});}
