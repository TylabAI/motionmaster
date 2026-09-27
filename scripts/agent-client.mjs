// Vendor-neutral, dependency-free HTTP client. Never automatically confirms cuts.
import {readFile} from 'node:fs/promises';
const args=process.argv.slice(2);
const flag=args.indexOf('--url');let base=process.env.MOTION_MASTER_URL??'http://127.0.0.1:4180';
if(flag>=0){base=args[flag+1];args.splice(flag,2);}base=base.replace(/\/$/,'');
const [command,id,value]=args;
async function call(path,method='GET',body){const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Error(JSON.stringify(data));console.log(JSON.stringify(data,null,2));}
try{
 if(command==='discover')await call('/.well-known/agent.json');
 else if(command==='tasks')await call('/api/agent/tasks');
 else if(command==='task'&&id)await call(`/api/projects/${encodeURIComponent(id)}/precut/agent-task`);
 else if(command==='start'&&id&&value!==undefined)await call(`/api/projects/${encodeURIComponent(id)}/precut`,'POST',{expectedVersion:Number(value),provider:'external'});
 else if(command==='submit'&&id&&value)await call(`/api/projects/${encodeURIComponent(id)}/precut/agent-result`,'POST',JSON.parse((await readFile(value,'utf8')).replace(/^\uFEFF/,'')));
 else console.log('Usage: node agent-client.mjs [--url BASE_WITH_OPTIONAL_PREFIX] discover | tasks | task PROJECT_ID | start PROJECT_ID VERSION | submit PROJECT_ID ENVELOPE.json\nSubmission file: {expectedVersion,jobId,result}. Read protocol/resultSchema before analyzing. User confirms cuts in the web UI.');
}catch(e){console.error(e.message);process.exitCode=1;}
