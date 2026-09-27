import path from 'node:path';
import {describe,expect,it} from 'vitest';
import {resolveLocalAsrModel} from './media';

describe('local ASR model resolution',()=>{
  it('resolves the documented runtime model path without dropping the models directory',()=>{
    const runtime=path.resolve('isolated-runtime');
    expect(resolveLocalAsrModel('runtime/models/faster-whisper-large-v3-turbo',runtime))
      .toBe(path.join(runtime,'models','faster-whisper-large-v3-turbo'));
  });
  it('keeps faster-whisper model names for on-demand downloads',()=>{
    expect(resolveLocalAsrModel('large-v3-turbo',path.resolve('runtime'))).toBe('large-v3-turbo');
  });
});
