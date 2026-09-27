import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base=process.env.MOTION_TEST_URL??'http://127.0.0.1:4188';
const id='silent-test-'+Date.now();
let r=await fetch(base+'/api/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({projectId:id,title:'无音轨验证'})});assert(r.ok);let p=await r.json();
r=await fetch(`${base}/api/projects/${id}/media`,{method:'POST',headers:{'x-motion-version':String(p.version),'x-motion-filename':'silent.mp4'},body:await readFile('verification/no-audio.mp4')});assert(r.ok);p=await r.json();
assert.equal(p.preCut,undefined);await fetch(`${base}/api/projects/${id}/precut`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expectedVersion:p.version})});
let result;for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,200));result=await(await fetch(`${base}/api/projects/${id}/precut`)).json();if(result.job.status!=='running')break;}
assert.equal(result.job.status,'completed');assert.equal(result.project.editPlan.removedRanges.length,0);assert.equal(result.project.editPlan.keptRanges[0].endFrame,397);assert(result.job.warnings.some(w=>w.includes('没有音轨')));
await writeFile('verification/noaudio-report.json',JSON.stringify(result.job,null,2));console.log(result.job);
