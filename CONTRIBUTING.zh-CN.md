# Contributing

[English](CONTRIBUTING.md) · [简体中文](CONTRIBUTING.zh-CN.md)

感谢参与 MotionMaster。提交代码前请先创建 Issue 说明问题、使用场景和预期行为；小型修复可以直接提交 Pull Request。

## 开发流程

```powershell
npm ci
npm run dev
```

提交前运行：

```powershell
npm run build
npm test
npm run test:api
npm run test:mcp
```

## 变更要求

- 时间轴、字幕和卡片时间必须使用整数帧。
- 卡片动画必须由 Remotion 帧时钟驱动，不能使用真实时间或不可复现随机数。
- API 写入必须携带 `expectedVersion`。
- 新卡片应提供 Schema、默认值、分类、来源说明和可验证预览。
- UI 变更需要同时检查窄窗口、时间轴拖动、键盘操作和项目重开后的持久化。
- 不要提交模型、视频、字幕、转录、项目 JSON、渲染结果、API Key 或本机路径。

## 提交信息

使用简短、具体的动词开头，例如：

- `Fix playhead selection on timeline cards`
- `Add model status refresh`
- `Document local ASR setup`

第三方代码或素材必须附许可证、来源 URL、作者和适配说明。没有明确再分发许可的内容不能合入仓库。
