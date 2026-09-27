import {afterEach,describe,expect,it} from 'vitest';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {normalizeAliyunTranscript,transcribeAliyunFile} from './aliyun-asr';

const temporary:string[]=[];
afterEach(async()=>{await Promise.all(temporary.splice(0).map(folder=>rm(folder,{recursive:true,force:true})));});

describe('Aliyun file transcription timestamps',()=>{
  it('converts millisecond word timestamps without inventing timing',()=>{
    const value=normalizeAliyunTranscript({transcripts:[{sentences:[{begin_time:100,end_time:900,text:'你好。',words:[{begin_time:100,end_time:500,text:'你',punctuation:''},{begin_time:500,end_time:900,text:'好',punctuation:'。'}]}]}]});
    expect(value.words).toEqual([{wordId:'aliyun-word-1',start:.1,end:.5,word:'你',probability:undefined},{wordId:'aliyun-word-2',start:.5,end:.9,word:'好。',probability:undefined}]);
  });
  it('rejects sentence-only results because the editor needs word timing',()=>{
    expect(()=>normalizeAliyunTranscript({transcripts:[{sentences:[{begin_time:0,end_time:1000,text:'只有句子'}]}]})).toThrow(/逐词时间戳/);
  });
  it('uploads local audio, polls the async task and preserves measured word timing',async()=>{
    const folder=await mkdtemp(path.join(os.tmpdir(),'motion-asr-'));temporary.push(folder);const audio=path.join(folder,'speech.wav');await writeFile(audio,Buffer.from('wav'));
    const calls:Array<{url:string;init?:RequestInit}>=[];
    const fetcher=async(input:any,init?:RequestInit)=>{const url=String(input);calls.push({url,init});
      if(url.includes('/uploads?'))return new Response(JSON.stringify({data:{upload_host:'https://upload.example',upload_dir:'temporary/one',oss_access_key_id:'id',policy:'policy',signature:'signature',x_oss_object_acl:'private',x_oss_forbid_overwrite:'true'}}));
      if(url==='https://upload.example')return new Response('',{status:200});
      if(url==='https://api.example/transcription')return new Response(JSON.stringify({output:{task_id:'task-1',task_status:'PENDING'}}));
      if(url==='https://api.example/tasks/task-1')return new Response(JSON.stringify({output:{task_status:'SUCCEEDED',results:[{subtask_status:'SUCCEEDED',transcription_url:'https://result.example/one.json'}]}}));
      return new Response(JSON.stringify({transcripts:[{sentences:[{begin_time:0,end_time:600,text:'测试',words:[{begin_time:0,end_time:300,text:'测'},{begin_time:300,end_time:600,text:'试'}]}]}]}));
    };
    const result=await transcribeAliyunFile(audio,{submitUrl:'https://api.example/transcription',queryUrl:'https://api.example/tasks/{task_id}',uploadUrl:'https://api.example/uploads',apiKey:'secret',model:'qwen-audio-3.0-asr-flash-filetrans',language:'zh',enableItn:true,vocabulary:'MotionMaster:8'},folder,undefined,fetcher as typeof fetch);
    expect(result.words.map(word=>[word.word,word.start,word.end])).toEqual([['测',0,.3],['试',.3,.6]]);
    const submit=calls.find(call=>call.url==='https://api.example/transcription')!;expect(submit.init?.headers).toMatchObject({'X-DashScope-Async':'enable','X-DashScope-OssResourceResolve':'enable'});
    expect(JSON.parse(String(submit.init?.body))).toMatchObject({input:{file_urls:['oss://temporary/one/speech.wav']},parameters:{language_hints:['zh'],vocabulary:{MotionMaster:8}}});
  });
});
