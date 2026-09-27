import {it,expect} from 'vitest';
import {transformBox,cardBox} from './card-layout';
it('resizes width and height independently with the opposite edge fixed',()=>{
  const b={x:20,y:30,width:25,height:15};
  expect(transformBox(b,'e',10,8)).toEqual({...b,width:35});
  expect(transformBox(b,'n',9,-8)).toEqual({...b,y:22,height:23});
  expect(transformBox(b,'w',5,0)).toEqual({...b,x:25,width:20});
});
it('keeps moved and resized boxes inside the video with a nonzero minimum',()=>{
  const b={x:20,y:30,width:25,height:15};
  expect(transformBox(b,'move',100,-100)).toEqual({...b,x:75,y:0});
  expect(transformBox(b,'se',-100,-100)).toEqual({...b,width:4,height:4});
});
it('uses the same explicit rectangle for preview and export',()=>{
  expect(cardBox({cardType:'lower-third',layout:{x:65,y:10,width:30,height:12,scale:1}} as any)).toEqual({x:65,y:10,width:30,height:12});
});
