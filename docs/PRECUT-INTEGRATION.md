# MotionMaster 初剪集成说明

## 使用

1. 启动独立版，创建项目，点击“导入视频”。
2. 导入只上传和读取媒体信息，完整保留素材。随后点击“开始初剪”才进行本地转录与初剪；已剪好的视频可选择“不剪辑，直接做动效”，进入动效时间轴且可直接导出。
3. 粗稿时间轴：主轨道显示保留片段；“删除 / 可恢复”轨道显示被剪除的源片段。两轨使用原片时间坐标。
4. 默认播放跳过删除区间；“播放全部”与删除段试听使用源片。“返回粗剪”切回剪后播放。
5. 双击灰色片段恢复；“初剪详情”查看理由、试听待审候选、逐项删除/恢复、重新分析或导入逐词 JSON。
6. 动效时间轴使用剪后连续时间；字幕与动效按同一映射定位。撤回保存至服务端，刷新不丢失。
7. “生成粗剪预览”编码 MP4；最终动效渲染仍沿用原来的粗剪审核流程。

## 融合的原有价值

- `editPlan.keptRanges/removedRanges`：继续作为轨道的数据事实源。
- 原片 Range 播放、试听、双击恢复、轨道切分、拖边和播放头交互。
- 字幕、动效、项目 JSON、expectedVersion、MCP 共用项目仓库。
- 保留原审核门槛、动效资产库和最终渲染链路。

## 同时修复

- 旧脚本固定 30 fps、把帧 0 当假值、过度删除连接词：由独立算法替代。
- 导入时不读取视频真实时长：现在先探测，避免默认 180 秒污染剪辑范围。
- 再次剪辑在已压缩坐标上累积重映射：保存源时间线并回投人工修改。
- 恢复已删除的字幕与卡片；切点跨卡时避免重复 ID。
- 撤回只改浏览器不保存：现在经项目接口持久化。
- UI 与旧 standalone worker 契约不一致：开发与独立版使用同一 HTTP 实现。
- 粗剪预览错误回退至旧视频：按素材 ID、帧率和保留区间生成内容键，仅匹配当前计划。
- 粗剪分段 AAC 再拼接的潜在累计误差：统一滤镜与连续编码，探测实际输出帧数。

## 运行依赖

Node 20+；本地模式使用 FFmpeg、faster-whisper 1.2.1 和独立 Python 环境。转录不向云端发送视频。源码包不包含模型权重，首次启动需要联网并默认下载 `large-v3-turbo`，正常运行使用本地权重。

ASR 环境保存在 `runtime/asr-env`，默认模型在 `runtime/models/faster-whisper-large-v3-turbo`。首次启动会自动创建环境、安装依赖并校验模型；失败后可运行 `npm run bootstrap:asr` 重试。详细规则见 `docs/本地ASR模型下载与使用规范.md`。ASR 缺失或失败时保留明确提示，只执行声学初剪；无音轨保留原片。

配置：`MOTION_ASR_PYTHON`、`MOTION_ASR_MODEL`、`MOTION_MASTER_FFMPEG` 可指定已有本地环境。

## 初剪模块与 Hypit 的关系

独立实现 Hypit 工作流里适合真实素材剪辑的部分，支持导入其转录格式。没有将 Hypit 的生成、复刻或完整 Runtime 打包进 MotionMaster。跨句内容精简、跑题识别不冒充已具备的自动能力；其决策接口可供 Agent 后续接入。

## API

- 上传 `/api/projects/:id/media` 仅保存素材，不启动转录或初剪。
- `GET /api/projects/:id/precut` 返回任务与当前项目。
- `POST /api/projects/:id/precut` 接受 expectedVersion、可选 transcript 和 decisions。
- `POST /api/projects/:id/precut/decision` 接受 expectedVersion、cutId、accept。
- 原 `edit-plan`、`rough-cut-render`、恢复和审核接口继续有效。

分析产物与原始逐词转录存入项目 `analysis/<jobId>`；重新导入新视频时旧原片不覆盖，并保存导入前项目快照。

## 验证

`npm test`；`node node_modules/typescript/bin/tsc -p tsconfig.server.json`；`npm run build`；`node scripts/verify-precut.mjs`。端到端脚本使用隔离测试项目，实际生成与编码音视频，校验完整覆盖、恢复、帧数、冲突及过期预览。浏览器另行验收导入、灰轨恢复、撤回持久化、候选删减和两种时间轴。
