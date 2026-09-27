import type {Word,Decision} from './index';
const clean=(text:string)=>text.replace(/[\p{P}\s]/gu,'').toLowerCase();
function similarity(a:string,b:string) {
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next;}
  return 1-row[b.length]/Math.max(a.length,b.length,1);
}

/** Detect a nearby restart from the same opening; keep the later, extended take.
 * No sentence timing is invented, and a repeated complete sentence stays review-only. */
export function detectRetakes(words:Word[],fps:number):Decision[] {
  const result:Decision[]=[];
  const boundary=(i:number)=>i===0||words[i].startFrame-words[i-1].endFrame>=fps*.3||/[。！？!?；;]$/.test(words[i-1].text);
  let coveredUntil=-1;
  for(let i=0;i<words.length-3;i++){
    if(i<coveredUntil||!boundary(i))continue;
    for(let j=i+1;j<words.length;j++){
      const elapsed=(words[j].startFrame-words[i].startFrame)/fps;
      if(elapsed>15)break;
      if(elapsed<1||!boundary(j))continue;
      const old=words.slice(i,j),a=clean(old.map(w=>w.text).join(''));
      if(a.length<10||a.length>100)continue;
      const following:Word[]=[];
      for(let k=j;k<words.length&&words[k].startFrame-words[j].startFrame<fps*20;k++){
        if(k>j&&words[k].startFrame-words[k-1].endFrame>fps*2)break;
        following.push(words[k]);
        if(clean(following.map(w=>w.text).join('')).length>a.length+20)break;
      }
      const b=clean(following.map(w=>w.text).join(''));
      if(a.slice(0,4)!==b.slice(0,4)||b.length<a.length+4)continue;
      let score=0;
      for(let length=Math.max(8,a.length-2);length<=Math.min(b.length-4,a.length+2);length++)score=Math.max(score,similarity(a,b.slice(0,length)));
      if(score<.85)continue;
      const unfinished=/(就会|就可以|然后|因为|所以|如果|当|的|就是|我们要|我想|需要|能够|应该)$/.test(a)&&!/[。！？!?]$/.test(old.at(-1)!.text);
      const automatic=unfinished&&score>=.9;
      const handles=Math.ceil(fps*.18);
      const start=Math.max(0,words[i].startFrame-handles,i?words[i-1].endFrame:0);
      const end=Math.max(old.at(-1)!.endFrame,words[j].startFrame-handles);
      if(end>words[j].startFrame)continue;
      result.push({cutId:`retake-${words[i].wordId}-${words[j].wordId}`,startFrame:start,endFrame:end,type:'retake',confidence:automatic?.94:.7,status:automatic?'accepted':'proposed',sourceWordIds:old.map(w=>w.wordId),
        reason:`${automatic?'口播中断后重说，保留后一遍':'疑似重说，可能是强调，请试听'}：前遍“${a}”；后遍“${b.slice(0,a.length+16)}”（${(words[j].startFrame/fps).toFixed(2)} 秒开始）。`});
      coveredUntil=j;break;
    }
  }
  return [...result,...detectRestartFragments(words,fps).filter(d=>!result.some(r=>r.startFrame<d.endFrame&&d.startFrame<r.endFrame))];
}

/** Recall pass only: an abandoned clause can start inside a fluent sentence.
 * These weak textual signals must never authorize an automatic cut. */
export function detectRestartFragments(words:Word[],fps:number):Decision[] {
 const result:Decision[]=[];
 for(let j=1;j<words.length;j++){
  const pause=words[j].startFrame-words[j-1].endFrame;
  if(pause<fps*.3||pause>fps*4)continue;
  const later:Word[]=[];
  for(let k=j;k<words.length&&words[k].startFrame-words[j].startFrame<fps*12;k++){
   if(k>j&&words[k].startFrame-words[k-1].endFrame>fps*2)break;
   later.push(words[k]);if(clean(later.map(w=>w.text).join('')).length>=60)break;
  }
  const b=clean(later.map(w=>w.text).join(''));
  for(let i=j-1;i>=0&&words[j].startFrame-words[i].startFrame<=fps*8;i--){
   const old=words.slice(i,j),a=clean(old.map(w=>w.text).join(''));
   if(a.length<4||a.length>40||/[。！？!?；;]/.test(old.map(w=>w.text).join(''))||b.length<a.length+4)continue;
   let common=0;while(common<Math.min(a.length,b.length)&&a[common]===b[common])common++;
   const anchor=/^(通过|所以|因为|如果|然后|就是|也就是|也就是说|大家|我们|你可以|可以|把|当)/.test(a);
   const incomplete=/(的|就会|就可以|需要|能够|应该|通过|把|让|对|在|向|给|大家|我们)$/.test(a);
   if(!anchor||!incomplete||common<2)continue;
   // A short shared connector alone is insufficient unless the abandoned tail
   // is also repeated in the replacement (e.g. 通过不同的 -> 通过AI模拟不同的岗位).
   if(common<4&&!b.slice(common).includes(a.slice(common)))continue;
   const start=Math.max(words[i].startFrame,i?words[i-1].endFrame:0),end=Math.min(words[j-1].endFrame,words[j].startFrame);
   if(end<=start||result.some(r=>r.startFrame<end&&start<r.endFrame))continue;
   result.push({cutId:`restart-${words[i].wordId}-${words[j].wordId}`,startFrame:start,endFrame:end,type:'retake',confidence:.7,status:'proposed',sourceWordIds:old.map(w=>w.wordId),
    reason:`疑似短残句或句中重启，必须结合上下文复核：前遍“${a}”在未完成结构处停顿；后遍“${b}”（${(words[j].startFrame/fps).toFixed(2)} 秒开始，词ID ${later.map(w=>w.wordId).join(',')}）。核对后遍是否完整替代、前遍有无独有信息；不能只凭相同连接词删除。`});
   break;
  }
 }
 return result;
}
