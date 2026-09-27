import {describe, expect, it} from 'vitest';
import {translateUiText} from './i18n';

describe('MotionMaster UI translations', () => {
  it('translates primary studio controls', () => {
    expect(translateUiText('编辑台', 'en')).toBe('Studio');
    expect(translateUiText('  章节导航  ', 'en')).toBe('  Chapter Navigation  ');
  });

  it('translates dynamic timeline status', () => {
    expect(translateUiText('已选 3 个素材', 'en')).toBe('3 items selected');
    expect(translateUiText('3 条可视轨道', 'en')).toBe('3 visible tracks');
  });

  it('translates generated catalog names and descriptions', () => {
    expect(translateUiText('添加 标志 · 模糊 · 揭示', 'en')).toBe('Add Logo · Blur · Reveal');
    expect(translateUiText('产品 · 揭示 · 来源目录的通用示例样式', 'en')).toBe('Product · Reveal · generic catalog preview');
  });

  it('preserves Chinese UI and project-authored text', () => {
    expect(translateUiText('编辑台', 'zh-CN')).toBe('编辑台');
    expect(translateUiText('口播动效示例', 'en')).toBe('口播动效示例');
  });
});
