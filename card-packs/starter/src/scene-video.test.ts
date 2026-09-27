import {it,expect} from 'vitest';
import {sceneVideoBox} from './ExplainScene';
import type {MotionProject} from '@motion-master/schema';
it('uses deterministic viewport easing with full source at entry, exit and outside scene',()=>{
 const p={canvas:{width:1920,height:1080},timeline:{cards:[{startFrame:60,durationFrames:150,autoScene:{split:true,side:'right'}}]}} as MotionProject;
 expect(sceneVideoBox(p,0).width).toBe(100);expect(sceneVideoBox(p,60).width).toBe(100);expect(sceneVideoBox(p,90)).toEqual({x:3,y:8,width:54,height:76,radius:18});expect(sceneVideoBox(p,209).width).toBe(100);expect(sceneVideoBox(p,210).width).toBe(100);
});

it('never shrinks the video for overlays, including cuts and transitions',()=>{
 const p={canvas:{width:2560,height:1440},timeline:{cards:[{startFrame:60,durationFrames:150,autoScene:{split:false,side:'right'}}]}} as MotionProject;
 for(let frame=0;frame<240;frame++)expect(sceneVideoBox(p,frame)).toEqual({x:0,y:0,width:100,height:100,radius:0});
});
