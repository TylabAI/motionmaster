# Third-party notices

[English](THIRD_PARTY_NOTICES.md) · [简体中文](THIRD_PARTY_NOTICES.zh-CN.md)

MotionMaster 自有代码使用根目录 MIT License。下列依赖、参考实现、工具和模型不因此变更许可证。

## Runtime dependencies

- **Remotion 4.0.520** — <https://github.com/remotion-dev/remotion>。使用者必须遵守 Remotion 当前许可证及适用的组织规模/用途条件。
- **React / React DOM** — MIT，<https://github.com/facebook/react>。
- **Vite** — MIT，<https://github.com/vitejs/vite>。
- **Zod** — MIT，<https://github.com/colinhacks/zod>。
- **Model Context Protocol TypeScript SDK** — MIT，<https://github.com/modelcontextprotocol/typescript-sdk>。
- **faster-whisper** — MIT，<https://github.com/SYSTRAN/faster-whisper>。首次启动按需安装，不包含在本源码包中。
- **FFmpeg / FFprobe** — 由 Remotion compositor 依赖或用户配置路径提供；适用许可证由具体二进制构建选项决定。本源码包不包含 FFmpeg 二进制文件。

完整 npm 依赖及精确版本以 `package-lock.json` 为准。

## Motion-card sources and references

- **React Video Editor Remotion Templates** — 上游 README 声明 MIT：<https://github.com/reactvideoeditor/remotion-templates>。MotionMaster 包含适配后的本地实现与来源链接，不包含上游仓库快照。
- **Motion Canvas Examples** — MIT：<https://github.com/motion-canvas/examples>。公共包只保留来源元数据和独立实现，不包含上游示例仓库快照。
- **Remotion Captions Kit** — MIT：<https://github.com/Fats403/remotion-captions-kit>。公共包不包含上游仓库快照。
- **Locomotion** — <https://github.com/locomotion-pro/locomotion>。当前公共包只保留目录元数据、来源链接和本项目通用预览实现，不分发其上游源码快照。上游未提供标准 LICENSE 文件时，不应把其源码重新打包发布。
- **Remotion Resources** — <https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/resources.mdx>。目录项是外部资源索引，不代表资源本身采用统一许可证。
- **LottieFiles** — <https://lottiefiles.com/>。目录项只保存外部入口；本源码包不包含从 LottieFiles 下载的动画文件。具体素材需遵守其各自许可。
- **html-video** — Apache-2.0 及其上游归属信息保存在 `docs/third-party/html-video/`。

## ASR model weights

本仓库不包含任何 Whisper / CTranslate2 模型权重。程序在用户确认后从配置的模型来源下载；模型文件的许可、归属和使用条件以对应模型仓库为准。
