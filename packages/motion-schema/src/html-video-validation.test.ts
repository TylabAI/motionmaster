import {it,expect} from 'vitest';
import {htmlVideoContentError as error} from './html-video-validation';
it('rejects invalid chart values and accepts user data',()=>{expect(error('hv-frame-data-chart-nyt',{items:'甲|-1'})).toBeTruthy();expect(error('hv-frame-data-chart-nyt',{items:'甲|12\n乙|36'})).toBeUndefined();});
it('rejects cyclic or missing tree parents',()=>{expect(error('hv-frame-decision-tree',{items:'a|b|甲\nb|a|乙'})).toMatch(/循环/);expect(error('hv-frame-decision-tree',{items:'a|missing|甲'})).toBeTruthy();expect(error('hv-frame-decision-tree',{items:'a|-|甲\nb|a|乙'})).toBeUndefined();});
