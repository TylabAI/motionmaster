# Semantic Cut

可独立调用的、非破坏式初剪模块。借鉴 Hypit 的“实测转录 → 源素材定位 → 显式执行计划”工作流，重新实现剪辑决策；不捆绑 Hypit 的生成服务、SVML 编译器或浏览器渲染器。

## 模块边界

- `src/index.ts`：零外部运行依赖的纯函数；区间运算、时间映射、逐词转录转换、保守剪辑计划。
- `src/media.ts`：FFmpeg 检测、媒体探测和可选本地 ASR。与纯算法分开。
- `src/cli.ts`：JSON 输入/输出，可由任意 Agent 或其他软件调用。
- MotionMaster 的 `precut.ts` 负责任务状态、版本锁和项目适配，不属于独立算法。

构建：`node scripts/build-runtime.mjs`（在 MotionMaster 源码根目录）。生成的 `dist-runtime/semantic-cut-api.mjs`、`semantic-cut.mjs` 可单独拷贝，无需安装 MotionMaster。

```js
import {planCut,readWords} from './semantic-cut-api.mjs';
const plan=planCut({fps:30,durationFrames:900,
  words:readWords(transcript,30,900),
  silences:[{startFrame:150,endFrame:210}]});
```

`node semantic-cut.mjs input.json output.json`：输入包含 fps、durationFrames、words/segments/passages 和可选 silences、decisions。

兼容 Whisper/faster-whisper 的 `words`/`segments[].words`、Hypit 的 `passages[].words`、MotionMaster 的 `wordCues`。缺失的词级时间保持未知；不会把 SRT 句级时间均匀分配成假词时间。

## 默认行为

- 声学检测：低于 -38 dB 且至少 0.9 秒的候选静音；句间两端保留约 0.18 秒。
- 转录与静音证据冲突时降为待审候选，不自动剪除。
- 独立犹豫音需满足切点条件；普通连接词“这个、然后、其实”不会按词表自动删除。
- 重复词默认待审。语义精简可通过 `decisions` 传入基于源词 ID 的删减建议，必须给出理由。
- 没有声学证据时，不把转录空白当作静音；无音轨保留整段；几乎全部被剪除时退回全量保留。
- 保留与删除区间完整划分 `[0,sourceDurationFrames)`。所有区间为左闭右开整数帧。

输出 `keptRanges`、`removedRanges`、`wordCues`、`cutDecisions`、`warnings`，不修改源文件。

## 范围

自动默认是保守初剪，不是内容摘要模型。重复论点、跑题、叙事重排依赖 Agent/人工的上下文判断；接口已支持带理由的语义决策，但不会伪称已运行大模型理解整片。

本地 ASR 为 faster-whisper 基础多语言模型，中文、专名、弱音和重叠说话仍需试听。原词和原片始终可回溯。更高质量模型可通过 MOTION_ASR_MODEL 指向本地兼容模型目录。

## 口播重说检测

在 15 秒邻近窗口中，以词级时间戳和停顿/句界寻找重复开头；长前缀高度相似、前遍语句未结束、后遍有明显延续时，将前遍放入可恢复轨。完整句重复只生成待审候选。当前为规则检测，不等同于理解所有口误或内容优劣。
