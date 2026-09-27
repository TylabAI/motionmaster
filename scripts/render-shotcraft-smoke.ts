import path from 'node:path';
import {mkdir,rm} from 'node:fs/promises';
import {createProject} from '../packages/motion-core/src/index.ts';
import {renderProjectMp4,renderProjectStills} from '../packages/motion-render/src/render.ts';
const project=createProject({projectId:'shotcraft-smoke',title:'Shotcraft 新卡烟测',durationFrames:72,width:640,height:360});
project.timeline.cards=[{cardId:'shotcraft',cardType:'shotcraft-radial-wave',cardVersion:'1.0.0',trackId:'overlay-main',startFrame:0,durationFrames:72,content:{title:'系统上电'},layout:{side:'left',scale:1},appearance:{accentRole:'cyan'},motion:{enterFrames:12,exitFrames:10},sourceSegmentIds:[]}];
const dir=path.resolve('tmp/shotcraft-smoke');await rm(dir,{recursive:true,force:true});await mkdir(dir,{recursive:true});console.log(JSON.stringify({stills:await renderProjectStills(project,dir),video:await renderProjectMp4(project,dir)},null,2));
