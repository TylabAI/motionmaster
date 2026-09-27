import {detectRetakes} from './retakes';
export {detectRetakes} from './retakes';
export type Range = {startFrame: number; endFrame: number};
export type Word = Range & {wordId: string; text: string; keep?: boolean; reason?: string};
export type Decision = Range & {cutId: string; type: 'pause' | 'filler' | 'duplicate' | 'off-topic' | 'retake'; confidence: number; sourceWordIds: string[]; status: 'proposed' | 'accepted' | 'rejected'; reason: string};
export type CutInput = {fps: number; durationFrames: number; words?: Word[]; silences?: Range[]; decisions?: Decision[]; minimumPauseSeconds?: number; handleSeconds?: number};

export function normalizeRanges(ranges: Range[], duration: number, mergeAdjacent = true): Range[] {
  if (!Number.isSafeInteger(duration) || duration < 1) throw new Error('Invalid source duration');
  const result: Range[] = [];
  for (const r of ranges) if (!Number.isSafeInteger(r.startFrame) || !Number.isSafeInteger(r.endFrame) || r.endFrame <= r.startFrame) throw new Error('Invalid frame range');
  for (const r of ranges.map(r => ({startFrame: Math.max(0, r.startFrame), endFrame: Math.min(duration, r.endFrame)})).filter(r => r.endFrame > r.startFrame).sort((a,b) => a.startFrame - b.startFrame)) {
    const last = result.at(-1);
    if (last && (r.startFrame < last.endFrame || (mergeAdjacent && r.startFrame === last.endFrame))) last.endFrame = Math.max(last.endFrame, r.endFrame);
    else result.push({...r});
  }
  return result;
}
export function complement(ranges: Range[], duration: number): Range[] {
  const gaps: Range[] = []; let cursor = 0;
  for (const r of normalizeRanges(ranges, duration)) { if (r.startFrame > cursor) gaps.push({startFrame: cursor, endFrame: r.startFrame}); cursor = r.endFrame; }
  if (cursor < duration) gaps.push({startFrame: cursor, endFrame: duration});
  return gaps;
}
export function sourceToEdited(frame: number, kept: Range[]): number { return kept.reduce((sum,r) => sum + Math.max(0, Math.min(frame,r.endFrame)-r.startFrame),0); }
export function editedToSource(frame: number, kept: Range[], edge: 'start'|'end' = 'start'): number {
  let cursor = Math.max(0,frame);
  for (const r of kept) { const length = r.endFrame-r.startFrame; if (cursor < length || (edge === 'end' && cursor === length)) return r.startFrame+cursor; cursor -= length; }
  return kept.at(-1)?.endFrame ?? 0;
}

/** Accept measured word times only. Never fabricate word windows from sentence SRTs. */
export function readWords(raw: any, fps: number, duration: number): Word[] {
  const source = raw.wordCues ?? raw.words ?? raw.segments?.flatMap((s: any) => s.words ?? []) ?? raw.passages?.flatMap((p: any) => p.words ?? []) ?? [];
  return source.flatMap((w: any, index: number) => {
    const start = w.startFrame ?? Math.floor(Number(w.start_seconds ?? w.start) * fps);
    const end = w.endFrame ?? Math.ceil(Number(w.end_seconds ?? w.end) * fps);
    const text = String(w.text ?? w.word ?? '').trim();
    if (!text || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || start >= duration) return [];
    return [{wordId: String(w.wordId ?? `word-${index+1}`), text, startFrame: Math.floor(start), endFrame: Math.min(duration, Math.ceil(end)), keep: true}];
  }).sort((a: Word,b: Word) => a.startFrame-b.startFrame);
}

export function planCut(input: CutInput) {
  const {fps,durationFrames} = input;
  if (!Number.isFinite(fps) || fps <= 0) throw new Error('Invalid frame rate');
  normalizeRanges([],durationFrames);
  const words = (input.words ?? []).map(w => ({...w,keep:true}));
  const handles = Math.max(1,Math.ceil((input.handleSeconds ?? .18)*fps));
  const minPause = Math.max(handles*2+1,Math.ceil((input.minimumPauseSeconds ?? .9)*fps));
  const decisions: Decision[] = [];
  const add = (r: Range, type: Decision['type'], status: Decision['status'], confidence: number, reason: string, sourceWordIds: string[] = []) => {
    if (r.endFrame > r.startFrame) decisions.push({...r,cutId:`cut-${decisions.length+1}`,type,status,confidence,reason,sourceWordIds});
  };
  // Acoustic evidence is required for automatic pause cuts: a missing ASR word is not silence.
  for (const silence of normalizeRanges(input.silences ?? [],durationFrames)) {
    if (silence.endFrame-silence.startFrame < minPause) continue;
    const cut = {startFrame:silence.startFrame===0?0:silence.startFrame+handles,endFrame:silence.endFrame===durationFrames?durationFrames:silence.endFrame-handles};
    const overlapsSpeech = words.some(w => w.startFrame < cut.endFrame && w.endFrame > cut.startFrame);
    add(cut,'pause',overlapsSpeech?'proposed':'accepted',overlapsSpeech?.5:.98,overlapsSpeech?'静音检测与转录冲突，请试听后决定':'较长低音量停顿；两端保留呼吸余量');
  }
  for (let i=0;i<words.length;i++) {
    const w=words[i], previous=words[i-1], next=words[i+1];
    const clean=w.text.replace(/[\p{P}\s]/gu,'').toLowerCase();
    // Context-bearing words such as 这个/然后/其实 are deliberately not filler rules.
    if (/^(嗯+|呃+|um+|uh+)$/.test(clean)) {
      const isolated=previous && next && w.startFrame-previous.endFrame >= handles && next.startFrame-w.endFrame >= handles;
      add(w,'filler',isolated?'accepted':'proposed',isolated?.92:.65,isolated?'独立犹豫音，前后有安全切点':'可能为犹豫音，也可能是回应；保留待审',[w.wordId]);
    }
    if (previous && clean.length >= 2 && clean === previous.text.replace(/[\p{P}\s]/gu,'').toLowerCase() && w.startFrame-previous.endFrame < fps*1.5) {
      add(w,'duplicate','proposed',.65,'相邻重复表述；可能是强调，默认保留',[w.wordId]);
    }
  }
  decisions.push(...detectRetakes(words,fps));
  for (const decision of input.decisions ?? []) {
    if (!decision.reason.trim() || decision.sourceWordIds.some(id => !words.some(w => w.wordId===id))) throw new Error('Semantic decision must reference existing source words and a reason');
    normalizeRanges([decision],durationFrames);
    if (decision.startFrame < 0 || decision.endFrame > durationFrames) throw new Error('Semantic decision is outside source');
    decisions.push({...decision,cutId:`semantic-${decisions.length+1}`});
  }
  let removedRanges = normalizeRanges(decisions.filter(d=>d.status==='accepted'),durationFrames);
  let keptRanges = complement(removedRanges,durationFrames);
  const warnings: string[]=[];
  if (keptRanges.reduce((sum,r)=>sum+r.endFrame-r.startFrame,0) < Math.min(durationFrames,Math.ceil(fps*.5))) {
    decisions.forEach(d=>{if(d.status==='accepted')d.status='proposed';}); removedRanges=[]; keptRanges=[{startFrame:0,endFrame:durationFrames}]; warnings.push('素材几乎全部被判为可删除；已保留整段，等待人工复核。');
  }
  for (const word of words) {
    const cut=decisions.find(d=>d.status==='accepted' && d.startFrame<=word.startFrame && d.endFrame>=word.endFrame);
    word.keep=!cut; if(cut)word.reason=cut.reason;
  }
  return {format:'semantic-cut@1',fps,sourceDurationFrames:durationFrames,keptRanges,removedRanges,wordCues:words,cutDecisions:decisions,warnings,editedDurationFrames:keptRanges.reduce((s,r)=>s+r.endFrame-r.startFrame,0)};
}

export function transcriptQualityWarnings(words: Word[], fps: number, durationFrames: number) {
  const covered=normalizeRanges(words,durationFrames).reduce((n,r)=>n+r.endFrame-r.startFrame,0);
  if (!words.length) return ['没有识别到可用人声，无法完成词句初剪；仅按声学证据判断停顿。'];
  if (durationFrames/fps>=60 && covered/durationFrames<.02) return [`语音识别覆盖不足：原片 ${Math.round(durationFrames/fps)} 秒，仅识别约 ${(covered/fps).toFixed(1)} 秒语音。可能为非口播素材或识别遗漏，请试听核对；未识别部分不会当作静音删除。`];
  return [];
}

export function subtitleCues(words: Word[], fps: number) {
  const rows: Array<Range & {cueId:string;text:string;wordIds:string[];status:'draft'}>=[];
  for(const word of words.filter(w=>w.keep!==false)) {
    let row=rows.at(-1);
    if(!row || word.startFrame-row.endFrame > fps*.6 || row.text.length>=28 || /[。！？!?；;]$/.test(row.text)) {
      row={cueId:`cue-${rows.length+1}`,startFrame:word.startFrame,endFrame:word.endFrame,text:'',wordIds:[],status:'draft'};rows.push(row);
    }
    row.text+=(/[a-z0-9]$/i.test(row.text)&&/^[a-z0-9]/i.test(word.text)?' ':'')+word.text;
    row.endFrame=word.endFrame; row.wordIds.push(word.wordId);
  }
  return rows;
}
