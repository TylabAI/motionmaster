# MotionMaster v1.6.2

[English](RELEASE_NOTES.md) · [简体中文](RELEASE_NOTES.zh-CN.md)

This is the first GitHub-ready source release of MotionMaster. MotionMaster is a completely free and open-source web application centered on video motion generation and editing, with an MCP capability layer that lets Agents operate, orchestrate, and extend the product.

## Product highlights

1. **Web application and MCP** — edit manually in the browser or let an Agent drive projects, timelines, motion cards, and exports through 41 MCP tools.
2. **Motion first** — generate, match, preview, and edit video motion graphics, supported by rough cutting, captions, splitting, snapping, and other practical editing features.
3. **Built-in library and Agent generation** — browse 275 motion catalog entries or let an Agent use captions, scenes, and pacing to match templates and generate editable parameters.
4. **Completely free** — MotionMaster-owned code is released under the MIT License with no software subscription fee. Run, modify, and redistribute it locally.

## Included capabilities

- Coordinated rough-cut and motion timelines
- Selection, splitting, dragging, resizing, and batch operations for video, caption, and motion items
- 275 motion catalog entries and 53 local foundational/core implementations
- Local discovery and download management for `medium`, `large-v3-turbo`, and `large-v3`
- Custom speech-transcription API configuration
- Project persistence, SRT import, preview, and export
- 41 MCP tools for Agent-driven workflows
- Runtime Simplified Chinese / English UI switching with browser-language defaults and persisted user preference

## Privacy and package size

This source package excludes model weights, Python environments, `node_modules`, build output, verification artifacts, real projects, user videos, project captions, transcripts, and credentials. The repository contains one synthetic SRT sample with no personal data, solely to document the import format.

## Get started

Read the root [README](README.md), then install dependencies and run:

```bash
npm install
npm run dev
```

Windows users can also run `start.bat`.
