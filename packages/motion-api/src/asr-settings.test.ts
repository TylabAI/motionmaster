import {describe,expect,it} from 'vitest';
import {DEFAULT_LOCAL_ASR_MODEL,defaultAsrSettings} from './asr-settings';

describe('ASR defaults',()=>{
  it('uses the bootstrapped large-v3-turbo directory for a new installation',()=>{
    expect(DEFAULT_LOCAL_ASR_MODEL).toBe('runtime/models/faster-whisper-large-v3-turbo');
    expect(defaultAsrSettings().provider).toBe('local-faster-whisper');
    expect(defaultAsrSettings().local.model).toBe(DEFAULT_LOCAL_ASR_MODEL);
  });
});
