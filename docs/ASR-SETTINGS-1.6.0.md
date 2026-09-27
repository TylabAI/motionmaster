# MotionMaster v1.6.0 语音识别与字幕

## 当前链路

此前正式版使用 `faster-whisper 1.2.1`、本地 `faster-whisper-base`、CPU `int8`。自 v1.6.1 起，源码包不携带模型权重，首次启动默认下载 `large-v3-turbo`。FFmpeg 先提取 16 kHz 单声道 WAV，`faster-whisper` 开启 `word_timestamps`、Silero VAD 和 beam size 5，输出真实逐词起止时间。FFmpeg 的 `silencedetect` 另外生成停顿候选，两条证据互相校验。

`base` 档位偏速度，中文专有词、口音、长句和录屏中的弱人声容易错。设置页允许切换到 `medium`、`large-v3-turbo`、`large-v3` 或已下载的任意 CTranslate2 Whisper 模型，并可设置语言、设备、计算精度和术语提示。模型生命周期与发布规则统一记录在 `docs/本地ASR模型下载与使用规范.md`。

## 两种时间轴来源

必须区分视频剪辑时间轴与字幕时间：

- 主视频轨道：来源于 FFprobe 读取的媒体时长，以及 `editPlan.keptRanges/removedRanges`。它不由 ASR 模型直接生成。
- 字幕轨道、章节导航、词句定位、语义粗剪：来源于 ASR 的逐词时间戳 `wordCues`。
- 停顿删除候选：来源于 FFmpeg 静音检测；如果与 ASR 词语重叠，只进入人工复核，不自动删除。
- 动效时间轴：以粗剪保留区间重新映射源视频帧，卡片可绑定真实词 ID；没有逐词时间不得伪造绑定。

因此，更换 ASR 不会让主视频时长消失，但会影响字幕、章节和基于词句的粗剪。v1.6.0 把逐词时间戳设为硬门槛：API 只返回文本或句级时间时，任务明确失败，现有项目轨道不变。

## 百炼文件转写

右上角“设置 → 语音识别与字幕”可选“百炼文件转写 API”，保存以下项目：任务提交地址、任务查询地址、临时文件上传凭证地址、API Key、模型 ID、语言、ITN 和专业词。

默认模型为 `qwen-audio-3.0-asr-flash-filetrans`。执行时只上传从视频提取的 16 kHz 单声道 WAV，不上传原视频。流程为：获取临时 OSS 上传凭证、上传音频、提交异步任务、轮询任务、下载结果、读取 `transcripts[].sentences[].words[].begin_time/end_time`，最后统一换算为秒和项目帧。API Key 保存在独立安装目录的 `projects/.motion-master-settings.json`，设置读取接口只返回“已配置”状态，不返回密钥内容，也不写入项目 JSON 或导出文件。

同时兼容 `qwen3-asr-flash-filetrans` 的请求结构，并强制 `enable_words=true`。不能选择无时间戳的 OpenAI 兼容 Qwen3-ASR-Flash 来做粗剪。

阿里云官方约束：文件转写采用异步提交与轮询；Qwen-Audio-3.0-ASR-Flash-Filetrans 固定返回时间戳；Qwen3-ASR-Flash-Filetrans 需要 `enable_words=true` 才返回字级时间戳；临时 `oss://` 文件调用需要 `X-DashScope-OssResourceResolve: enable`。

## 对外部技术设计的取舍

`video-asr-technical-design.md` 描述的是 PipClaw 的 `sherpa-onnx + SenseVoice + 固定 60 秒切片`，不是 MotionMaster 现状。吸收其中 VAD/ASR 分层、引擎与时间精度元数据、缓存按模型版本失效、临时音频清理和明确降级等原则。

其中“句段级时间为强制、词级可选”不适合本产品；口播粗剪必须有逐词时间。文档的“音频不上传”只适用于本地模式；百炼模式由用户主动选择，并在设置界面明确说明上传的是提取音频。

## 本地后续方案

当前立即可用的升级路线是 faster-whisper `large-v3-turbo`（速度与准确率平衡）或 `large-v3`（准确率优先），再按机器选择 CUDA/float16 或 CPU/int8。中文专用路线可评估 FunASR Paraformer/SenseVoice + FSMN-VAD + 标点模型；时间精度要求更高时可评估 WhisperX 强制对齐。接入任何新引擎都必须输出逐词时间、记录模型与管线版本，并通过真实中文口播基准集后才能成为默认项。

## 验证

- 服务端与前端 TypeScript 检查通过。
- 231 项回归测试通过，新增阿里云毫秒时间戳转换、句级结果拒绝、临时上传、异步提交、轮询和结果下载测试。
- 隔离数据目录实测设置读写；API Key 的 GET 响应不泄露密钥。
- 浏览器实测顶部设置入口、两种引擎、URL/Key/模型/语言/ITN/热词字段和时间轴保护说明。
- 未使用真实百炼 Key 产生费用，因此未声称完成真实云端计费调用；网络协议按官方 HTTP 文档实现并由模拟端到端测试覆盖。
