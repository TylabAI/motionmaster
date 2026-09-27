import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:4181';
async function api(route,method='GET',body){const r=await fetch(base+route,{method,headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});const json=await r.json();assert.ok(r.ok,JSON.stringify(json));return json;}
assert.equal((await api('/api/system')).version,'1.5.2-assets');
const catalog=await api('/api/cards');
let p=await api('/api/projects','POST',{projectId:'assets-ui-'+Date.now(),title:'资产与换模板验收',durationFrames:900});
const route='/api/projects/'+p.projectId,definition=catalog.find(d=>d.cardType==='hv-frame-bold-poster');
p=await api(route+'/cards','POST',{expectedVersion:p.version,card:{...definition.defaults,cardId:'template-test',trackId:'overlay-main',startFrame:0,durationFrames:210,content:{...definition.defaults.content,title:'用户保留标题',items:'甲|10\n乙|20'},layout:{...definition.defaults.layout,scale:.4}}});
p=await api(route);
let before=structuredClone(p.timeline.cards[0]);let count=0;
for(const target of catalog){
 if(target.cardType===before.cardType)continue;
 p=await api(route+'/cards/'+before.cardId,'PATCH',{expectedVersion:p.version,patch:{content:{...before.content,items:target.cardType==='hv-frame-decision-tree'?'root|-|用户保留节点\nchild|root|用户保留子节点':'甲|10\n乙|20'}}});
 before=structuredClone(p.timeline.cards[0]);
 p=await api(route+'/card-design','POST',{expectedVersion:p.version,cardId:before.cardId,cardType:target.cardType});
 const c=p.timeline.cards[0];assert.equal(c.cardType,target.cardType);assert.equal(c.content.title,before.content.title);assert.deepEqual(c.layout,before.layout);assert.equal(c.durationFrames,before.durationFrames);assert.equal(c.startFrame,before.startFrame);
 p=await api(route+'/card-design','POST',{expectedVersion:p.version,cardId:before.cardId,restore:true});assert.equal(p.timeline.cards[0].cardType,before.cardType);count++;
}
const report={version:'1.5.2-assets',catalog:catalog.length,switchedAndRestored:count,currentTemplateNoop:1,project:p.projectId,preserved:['id','text','timing','layout','history']};
await writeFile('verification/assets-stage-1.5.2/api-result.json',JSON.stringify(report,null,2));console.log(report);
