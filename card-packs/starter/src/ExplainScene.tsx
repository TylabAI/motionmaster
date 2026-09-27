import type {MotionProject,MotionCardInstance} from '@motion-master/schema';

/** Same frame-driven viewport in HTML preview and Remotion export. */
export function sceneVideoBox(project:MotionProject,frame:number){
 const card=project.timeline.cards.find(c=>c.autoScene?.split&&frame>=c.startFrame&&frame<c.startFrame+c.durationFrames);
 if(!card)return {x:0,y:0,width:100,height:100,radius:0};
 const portrait=project.canvas.height>project.canvas.width;
 const target=portrait?{x:3,y:3,width:94,height:47}: {x:card.autoScene!.side==='left'?43:3,y:8,width:54,height:76};
 const length=Math.max(1,Math.min(12,card.durationFrames/3));
 const t=Math.max(0,Math.min(1,(frame-card.startFrame)/length,(card.startFrame+card.durationFrames-1-frame)/length));
 const mix=t*t*(3-2*t);
 return {x:target.x*mix,y:target.y*mix,width:100+(target.width-100)*mix,height:100+(target.height-100)*mix,radius:18*mix};
}

export function ExplainScene({card,frame}:{card:MotionCardInstance;frame:number}){
 const kind=card.autoScene?.kind??'emphasis',items=card.autoScene?.items??[];
 const accent=kind==='comparison'?'#ffd080':kind==='summary'?'#b9ef93':'#72e8df';
 const labels={chapter:'CHAPTER',steps:'STEP BY STEP',comparison:'COMPARE',emphasis:'KEY POINT',summary:'TAKEAWAY'};
 return <div style={{boxSizing:'border-box',height:'100%',padding:'6%',borderRadius:20,background:'#111c28f5',border:`1px solid ${accent}66`,boxShadow:'0 10px 32px #0005',display:'flex',flexDirection:'column',justifyContent:kind==='chapter'||kind==='emphasis'?'center':'flex-start',gap:18,color:'#f5f8ff'}}>
  <div style={{fontSize:16,letterSpacing:3,color:accent}}>{labels[kind]}</div>
  <div style={{fontSize:kind==='chapter'?'clamp(28px, 6cqw, 60px)':'clamp(24px, 5cqw, 50px)',fontWeight:750,lineHeight:1.25,overflowWrap:'anywhere'}}>{String(card.content.title??'')}</div>
  {!!card.content.body&&<div style={{fontSize:'clamp(18px, 3.2cqw, 30px)',lineHeight:1.45,color:'#c1cddc'}}>{String(card.content.body)}</div>}
  {!!items.length&&<div style={{display:'grid',gridTemplateColumns:kind==='comparison'?'1fr 1fr':'1fr',gap:16,marginTop:8}}>{items.map((item,i)=>{
   const show=Math.max(0,Math.min(1,(frame-item.revealFrame)/10));
   return <div key={i} style={{opacity:show,transform:`translateY(${(1-show)*12}px)`,borderLeft:`3px solid ${accent}`,padding:'12px 14px',background:'#ffffff0a',fontSize:'clamp(20px, 3.7cqw, 36px)',lineHeight:1.4,overflowWrap:'anywhere'}}>{kind==='steps'&&<span style={{color:accent,marginRight:14}}>0{i+1}</span>}{item.text}</div>;
  })}</div>}
 </div>;
}
