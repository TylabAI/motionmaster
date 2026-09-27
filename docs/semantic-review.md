# 自动语义初剪

支持可选分析驱动：Codex 自动调用，或通用 Agent 通过 HTTP/MCP 拉取任务后提交结果。通用模式不依赖 Codex 安装、登录或账号，详见 [通用 Agent 接入](agent-integration.md)。网页中的“分析驱动”可切换；下文第 4 步的 Codex 调用仅适用于 Codex 模式。

## 用户流程

1. 网页导入视频，只保存原片，不执行剪辑。
2. 点击“开始初剪”：本地 FFmpeg 检测声学候选，faster-whisper 生成实测逐词字幕和时间戳。
3. 抽取最多 16 张静帧：全片概览、较长停顿的前/中/后画面和重说候选画面。
4. 后台通过本机已登录的 Codex CLI 分析完整字幕、时间戳、规则候选及静帧。静音候选也逐一复核；尚未修改主轨或可恢复轨。
5. 自动弹出确认方案：查看理由/保留依据，定位原片试听，勾选删除项。关闭弹窗仅暂存方案。
6. 点击“确认执行初剪”才应用所选区间，生成可恢复轨并映射已有动效。未勾选的建议保留。

## Codex 接入

采用官方 `codex exec --ephemeral --sandbox read-only --output-schema ... --image ...`。
https://learn.chatgpt.com/docs/non-interactive-mode

- 自动寻找本机 Codex 安装；可用 MOTION_CODEX_EXE 指定可执行文件。
- 使用当前本机 Codex 登录与账号额度。默认读取用户 model 设置；可用 MOTION_CODEX_MODEL 覆盖。
- 不读取或复制登录令牌，不把令牌传给网页；执行时不加载用户插件配置或 hooks。
- 模型只收到全文字幕、时间戳、剪辑候选和选取静帧；不上传原始视频。
- 独立后台调用，不是自动唤起某个现存 Codex 对话。
- 未登录、超时、格式错误、静帧/转录失败或项目版本冲突均不会执行剪辑。静帧失败可降级文字分析并明确提示。

## 接口与边界

- POST `/api/projects/:id/precut`：开始完整自动分析。
- GET `/api/projects/:id/precut`：进度及项目。状态 running → awaiting-confirmation → completed；失败为 failed。
- GET `/api/projects/:id/precut/frame/:frameId`：本轮选取静帧，只允许清单内文件。
- POST `/api/projects/:id/precut/confirm`：JSON `{expectedVersion, jobId, cutIds}`，原子应用用户勾选项。
- 待确认状态禁止通过旧的单项删除接口绕过确认。确认会验证素材、字幕、剪辑快照、候选ID、保留依据冲突、最小保留时长；重复确认拒绝。
- 原视频不改动；已有人工剪辑不重置，已有动效由 applyEditPlan 映射。
- 静帧是局部视觉证据，不代表看过连续动作；无法判断的演示停顿保留待审。模型并未直接听音频，口误和切点仍应试听核对。
- 默认预选模型复核为 remove 的规则候选，以及把握至少 0.85 的非跑题语义建议；与保留依据冲突的项不会预选。把握值不是校准准确率。

人工 Agent 的 GET/POST `/semantic-review` 及 motion_semantic_review_get/submit 仍保留，用于没有待确认自动方案时的高级任务交换，不是默认用户流程。
