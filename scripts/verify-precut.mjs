import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.MOTION_TEST_URL??'http://127.0.0.1:4187';
async function api(url,body,method='POST'){
  const r=await fetch(base+url,{method,headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();assert(r.ok,JSON.stringify(data));return data;
}
const id=`precut-test-${Date.now()}`;
let p=await api('/api/projects',{projectId:id,title:'初剪集成验证'});
const upload=await fetch(`${base}/api/projects/${id}/media`,{method:'POST',headers:{'content-type':'video/mp4','x-motion-filename':encodeURIComponent('初剪验证.mp4'),'x-motion-version':String(p.version)},body:await readFile('verification/input.mp4')});
assert(upload.ok,await upload.clone().text());p=await upload.json();assert.equal(p.preCut,undefined);assert.equal(p.editPlan.removedRanges.length,0);
assert.equal((await api(`/api/projects/${id}/precut`,null,'GET')).job,undefined);
p=await api(`/api/projects/${id}/edit-review/approve`,{expectedVersion:p.version});assert.equal(p.editReview.status,'approved');assert.equal(p.preCut,undefined);
p=await api(`/api/projects/${id}/precut`,{expectedVersion:p.version});assert.equal(p.preCut.status,'running');
console.log('Uploaded unchanged; user-requested analysis started',id);
let job;const deadline=Date.now()+180_000;
do{await new Promise(r=>setTimeout(r,1200));({project:p,job}=await api(`/api/projects/${id}/precut`,null,'GET'));if(Date.now()>deadline)throw Error('Timed out');}while(job.status==='running');
assert.equal(job.status,'completed',JSON.stringify(job));assert.equal(job.mode,'transcript-and-acoustic',JSON.stringify(job));
assert(p.transcript.wordCues.length>5);assert(p.editPlan.removedRanges.length>0);
const initial=structuredClone(p),ranges=[...p.editPlan.keptRanges,...p.editPlan.removedRanges].sort((a,b)=>a.startFrame-b.startFrame);
let cursor=0;for(const r of ranges){assert.equal(r.startFrame,cursor);cursor=r.endFrame;}assert.equal(cursor,p.editPlan.sourceDurationFrames);
const media=await fetch(`${base}/api/projects/${id}/media`,{headers:{Range:'bytes=0-99'}});assert.equal(media.status,206);assert.equal((await media.arrayBuffer()).byteLength,100);
const render=await api(`/api/projects/${id}/rough-cut-render`);assert.equal(render.durationFrames,p.canvas.durationFrames);
const preview=await fetch(`${base}/api/projects/${id}/rough-cut-media`);assert(preview.ok);await preview.body.cancel();
p=await api(`/api/projects/${id}/edit-plan`,{expectedVersion:p.version,keptRanges:[{startFrame:0,endFrame:p.editPlan.sourceDurationFrames}]});
assert.equal(p.editPlan.removedRanges.length,0);assert.equal(p.canvas.durationFrames,initial.editPlan.sourceDurationFrames);
const stale=await fetch(`${base}/api/projects/${id}/rough-cut-media`);assert(!stale.ok,'Stale preview must not be served');
p=await api(`/api/projects/${id}/edit-plan`,{expectedVersion:p.version,keptRanges:initial.editPlan.keptRanges});
assert.equal(p.canvas.durationFrames,initial.canvas.durationFrames);assert.deepEqual(p.timeline.segments,initial.timeline.segments);
const conflict=await fetch(`${base}/api/projects/${id}/edit-plan`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expectedVersion:0,keptRanges:initial.editPlan.keptRanges})});assert.equal(conflict.status,409);
const report={id,job,words:p.transcript.wordCues.length,kept:p.editPlan.keptRanges,removed:p.editPlan.removedRanges,sourceFrames:p.editPlan.sourceDurationFrames,editedFrames:p.canvas.durationFrames,render,checks:['upload preserves original; explicit request starts ASR','source partition complete','range streaming','real MP4 encoding/frame count','restore all','reject stale preview','reapply without time drift','optimistic concurrency']};
await writeFile('verification/precut-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

const again=await fetch(`${base}/api/projects/${id}/media`,{method:'POST',headers:{'content-type':'video/mp4','x-motion-version':String(p.version)},body:await readFile('verification/input.mp4')});assert(again.ok);p=await again.json();assert.equal(p.preCut,undefined);assert.equal((await api(`/api/projects/${id}/precut`,null,'GET')).job,undefined);assert.equal(p.editPlan.removedRanges.length,0);console.log('Reimport: no automatic job, no stale job, full source retained.');
