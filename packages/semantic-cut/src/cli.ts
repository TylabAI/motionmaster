import {readFile,writeFile} from 'node:fs/promises';
import {planCut,readWords} from './index';
const [input,output='cut-plan.json']=process.argv.slice(2);
if(!input)throw new Error('usage: semantic-cut <input.json> [cut-plan.json]; input: fps, durationFrames, words/segments/passages, silences');
const raw=JSON.parse(await readFile(input,'utf8'));
const result=planCut({...raw,words:readWords(raw,raw.fps,raw.durationFrames)});
await writeFile(output,JSON.stringify(result,null,2));
console.log(JSON.stringify({output,kept:result.keptRanges.length,removed:result.removedRanges.length}));
