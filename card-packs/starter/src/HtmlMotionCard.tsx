import {useEffect,useMemo,useRef,useState} from 'react';
import {delayRender,continueRender,cancelRender,useRemotionEnvironment} from 'remotion';
import {htmlMotionSchema,validateHtmlValues,type HtmlMotionSpec} from '../../../packages/motion-schema/src/html-motion';
import type {MotionCardInstance} from '@motion-master/schema';
export function htmlDocument(spec:HtmlMotionSpec,values:Record<string,unknown>,channel:string){
 const nonce=channel.replace(/[^a-zA-Z0-9]/g,'');
 const payload=JSON.stringify({spec:{fields:spec.fields},values,channel}).replace(/</g,'\\u003c');
 const runtime=`const config=${payload};for(const f of config.spec.fields){const v=config.values[f.key]??f.default;document.querySelectorAll('[data-mm-field]').forEach(el=>{if(el.getAttribute('data-mm-field')===f.key)el.textContent=String(v)});if(f.type==='color'||f.type==='number')document.documentElement.style.setProperty('--mm-'+f.key,String(v))}window.addEventListener('message',e=>{if(e.source!==parent||e.data.channel!==config.channel||e.data.type!=='seek')return;try{for(const a of document.getAnimations()){a.pause();a.currentTime=e.data.ms}requestAnimationFrame(()=>{parent.postMessage({type:'painted',channel:config.channel,seq:e.data.seq},'*')})}catch(error){parent.postMessage({type:'failed',channel:config.channel,error:String(error)},'*')}});document.getAnimations().forEach(a=>a.pause());parent.postMessage({type:'ready',channel:config.channel},'*');`;
 return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; base-uri 'none'; form-action 'none'"><style>html,body{margin:0;width:${spec.width}px;height:${spec.height}px;overflow:hidden;background:transparent;box-sizing:border-box}*,*:before,*:after{box-sizing:border-box}</style></head><body>${spec.html}<script nonce="${nonce}">${runtime}</script></body></html>`;
}
export function HtmlMotionCard({card,frame,fps=30}:{card:MotionCardInstance;frame:number;fps?:number}){
 const rendering=useRemotionEnvironment().isRendering,outer=useRef<HTMLDivElement>(null),iframe=useRef<HTMLIFrameElement>(null),[scale,setScale]=useState(1),[error,setError]=useState('');
 const channel=useMemo(()=>`mm${Math.random().toString(36).slice(2)}`,[]);
 const parsed=useMemo(()=>{try{const spec=htmlMotionSchema.parse(card.content.htmlSpec);validateHtmlValues(spec,card.content.htmlValues);return {spec,html:htmlDocument(spec,(card.content.htmlValues??{}) as Record<string,unknown>,channel)};}catch(e){return {error:String(e)};}},[card.content.htmlSpec,card.content.htmlValues,channel]);
 const [initial]=useState(()=>rendering?delayRender('HTML动效初始化',{timeoutInMilliseconds:15000}):null),first=useRef(true);
 useEffect(()=>{const el=outer.current;if(!el||!parsed.spec)return;const measure=()=>setScale(Math.min(el.clientWidth/parsed.spec!.width,el.clientHeight/parsed.spec!.height));const ro=new ResizeObserver(measure);ro.observe(el);measure();return()=>ro.disconnect();},[parsed]);
 useEffect(()=>{
  if(parsed.error){setError(parsed.error);if(rendering)cancelRender(new Error(parsed.error));return;}
  setError('');const handle=rendering?(first.current?initial:delayRender('HTML动效逐帧同步',{timeoutInMilliseconds:15000})):null;first.current=false;let done=false;
  const seq=frame;const seek=()=>iframe.current?.contentWindow?.postMessage({type:'seek',channel,seq,ms:frame/Math.max(1,card.durationFrames)*parsed.spec!.durationSeconds*1000},'*');
  const finish=()=>{if(done)return;done=true;if(handle!==null)continueRender(handle);};
  const listener=(e:MessageEvent)=>{if(e.source!==iframe.current?.contentWindow||e.data?.channel!==channel)return;if(e.data.type==='ready')seek();if(e.data.type==='painted'&&e.data.seq===seq)finish();if(e.data.type==='failed'){setError(e.data.error);if(rendering)cancelRender(Error(e.data.error));}};
  window.addEventListener('message',listener);seek();const retry=setInterval(()=>{if(!done)seek();},80);const timer=setTimeout(()=>{if(!done){setError('HTML动效未响应，请检查内容');if(rendering)cancelRender(Error('HTML动效未响应'));}},10000);
  return()=>{clearInterval(retry);clearTimeout(timer);window.removeEventListener('message',listener);finish();};
 },[frame,fps,card.durationFrames,parsed,channel,rendering,initial]);
 return <div ref={outer} style={{position:'absolute',inset:0,display:'grid',placeItems:'center'}}>{parsed.spec&&<iframe ref={iframe} title="HTML动效" sandbox="allow-scripts" srcDoc={parsed.html} style={{position:'absolute',width:parsed.spec.width,height:parsed.spec.height,border:0,transform:`scale(${scale})`,transformOrigin:'center',pointerEvents:'none',background:'transparent'}}/>}{error&&<div role="alert" style={{background:'#561f29',color:'white',padding:20,fontSize:22}}>{error}</div>}</div>;
}
