import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {MotionProject,MotionCardInstance} from '@motion-master/schema';
import {htmlMotionSchema,htmlMotionInstructions} from '../../motion-schema/src/html-motion';
import {starterCardDefinitions} from '@motion-master/cards-starter';
export const htmlDesignResultSchema=z.object({projectId:z.string(),jobId:z.string(),fingerprint:z.string(),summary:z.string().max(2000),spec:htmlMotionSchema}).strict();
export function designFingerprint(p:MotionProject,cardId:string){const c=p.timeline.cards.find(c=>c.cardId===cardId);if(!c)throw Error('卡片已不存在');return createHash('sha256').update(JSON.stringify({card:c,fps:p.canvas.fps,canvas:p.canvas,asset:p.media.assetId})).digest('hex');}
export function htmlDesignTask(p:MotionProject){const j=p.htmlDesign;if(!j||!['running','awaiting-agent'].includes(j.status))throw Error('没有待处理的HTML设计任务');return {format:'motion-html-design@1',projectId:p.projectId,jobId:j.jobId,expectedVersion:p.version,fingerprint:j.fingerprint,prompt:j.prompt,instructions:htmlMotionInstructions,card:p.timeline.cards.find(c=>c.cardId===j.cardId),fps:p.canvas.fps,resultSchema:z.toJSONSchema(htmlDesignResultSchema,{io:'output'})};}
export function rememberDesign(c:MotionCardInstance){const history=Array.isArray(c.content.designHistory)?c.content.designHistory:[];const {designHistory,...content}=c.content;return [...history,{cardType:c.cardType,cardVersion:c.cardVersion,content,appearance:c.appearance,motion:c.motion}].slice(-5);}
export function replaceHtmlCard(c:MotionCardInstance,raw:unknown){const spec=htmlMotionSchema.parse(raw);if(!spec.fields.length)throw Error('HTML设计必须有可编辑参数');const history=rememberDesign(c);const texts=spec.fields.filter(f=>f.type==='text');c.cardType='html-motion';c.cardVersion='1';c.content={title:c.content.title??texts[0]?.default,body:c.content.body??texts[1]?.default,htmlSpec:spec,htmlValues:Object.fromEntries(spec.fields.map(f=>[f.key,f.default])),designHistory:history};c.motion={enterFrames:0,exitFrames:0};}
export function applyHtmlDesign(p:MotionProject,raw:unknown){const r=htmlDesignResultSchema.parse(raw),j=p.htmlDesign;if(!j||!['running','awaiting-agent'].includes(j.status)||j.jobId!==r.jobId||p.projectId!==r.projectId||j.fingerprint!==r.fingerprint||designFingerprint(p,j.cardId)!==r.fingerprint)throw Error('任务或卡片已经变化，旧设计未应用');if(!r.spec.fields.length)throw Error('HTML设计必须有可编辑参数');const c=p.timeline.cards.find(c=>c.cardId===j.cardId)!;replaceHtmlCard(c,r.spec);j.status='completed';j.stage=r.summary;delete j.error;}
export function restyleCard(p:MotionProject,cardId:string,type:string){
 const c=p.timeline.cards.find(c=>c.cardId===cardId),d=starterCardDefinitions.find(d=>d.cardType===type);
 if(!c||!d)throw Error('卡片或目标样式不存在');
 if(c.cardType===type)return;
 const portable={...c.content};
 if(c.cardType==='html-motion'){
  const spec=htmlMotionSchema.parse(c.content.htmlSpec),values=(c.content.htmlValues??{}) as Record<string,unknown>;
  for(const key of ['title','body','label','items','source','value','suffix']){const f=spec.fields.find(f=>f.key===key);if(f)portable[key]=values[key]??f.default;}
 }
 if(c.autoScene?.items.length)portable.items=c.autoScene.items.map(i=>i.text).join('\n');
 if(type.startsWith('hv-')&&d.category==='data'&&!String(portable.items??'').split('\n').some(line=>line.includes('|')&&Number.isFinite(Number(line.split('|')[1]))))throw Error('切换数据样式前，请先填写真实数据（名称|数值）');
 // Renderer configuration belongs to the destination; only narrative content travels.
 for(const key of ['htmlSpec','htmlValues','designHistory','visualKind','variant','sourceCount'])delete portable[key];
 const history=rememberDesign(c);
 const content:Record<string,unknown>={...structuredClone(d.defaults.content),...portable,designHistory:history};
 if(type==='html-motion'){
  const spec=htmlMotionSchema.parse(content.htmlSpec);
  content.htmlValues=Object.fromEntries(spec.fields.map(f=>[f.key,typeof portable[f.key]===typeof f.default?portable[f.key]:f.default]));
 }
 c.cardType=d.cardType;c.cardVersion=d.version;c.content=content;
 c.appearance={...d.defaults.appearance};c.motion={...d.defaults.motion};
}
export function restoreDesign(p:MotionProject,cardId:string){const c=p.timeline.cards.find(c=>c.cardId===cardId);if(!c)throw Error('卡片不存在');const history=Array.isArray(c.content.designHistory)?[...c.content.designHistory]:[];const last=history.pop();if(!last)throw Error('没有上一版设计');c.cardType=last.cardType;c.cardVersion=last.cardVersion;c.content={...last.content,designHistory:history};c.appearance=last.appearance;c.motion=last.motion;}
