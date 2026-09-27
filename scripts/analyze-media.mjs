#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {analyzeMedia} from '../dist-runtime/semantic-cut-media.mjs';
const [media,output='analysis.json']=process.argv.slice(2);
if(!media)throw Error('usage: node scripts/analyze-media.mjs <video> [analysis.json]');
const transcript=process.env.MOTION_TRANSCRIPT_JSON?JSON.parse(await readFile(process.env.MOTION_TRANSCRIPT_JSON,'utf8')):undefined;
const plan=await analyzeMedia(path.resolve(media),{fps:Number(process.env.MOTION_FPS??30),runtimeRoot:path.resolve('runtime'),workDir:path.resolve(`${output}.assets`),transcript,onProgress:stage=>console.error(stage)});
await writeFile(output,JSON.stringify(plan,null,2));console.log(JSON.stringify({output,kept:plan.keptRanges.length,removed:plan.removedRanges.length,mode:plan.mode}));
