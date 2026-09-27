# Third-party notices

[English](THIRD_PARTY_NOTICES.md) · [简体中文](THIRD_PARTY_NOTICES.zh-CN.md)

MotionMaster-owned code uses the MIT License in the repository root. This does not change the licenses of the following dependencies, reference implementations, tools, or models.

## Runtime dependencies

- **Remotion 4.0.520** — <https://github.com/remotion-dev/remotion>. Users must follow Remotion's current license and any applicable organization-size or use restrictions.
- **React / React DOM** — MIT, <https://github.com/facebook/react>.
- **Vite** — MIT, <https://github.com/vitejs/vite>.
- **Zod** — MIT, <https://github.com/colinhacks/zod>.
- **Model Context Protocol TypeScript SDK** — MIT, <https://github.com/modelcontextprotocol/typescript-sdk>.
- **faster-whisper** — MIT, <https://github.com/SYSTRAN/faster-whisper>. Installed on demand during setup and not included in this source package.
- **FFmpeg / FFprobe** — provided through the Remotion compositor dependency or a user-configured path. The applicable license depends on the binary's build options. No FFmpeg binary is included in this source package.

See `package-lock.json` for the complete npm dependency graph and exact versions.

## Motion-card sources and references

- **React Video Editor Remotion Templates** — the upstream README states MIT: <https://github.com/reactvideoeditor/remotion-templates>. MotionMaster includes adapted local implementations and source links, but no upstream repository snapshot.
- **Motion Canvas Examples** — MIT: <https://github.com/motion-canvas/examples>. The public package retains source metadata and independent implementations, but no upstream example-repository snapshot.
- **Remotion Captions Kit** — MIT: <https://github.com/Fats403/remotion-captions-kit>. The public package contains no upstream repository snapshot.
- **Locomotion** — <https://github.com/locomotion-pro/locomotion>. This public package retains catalog metadata, source links, and generic MotionMaster preview implementations only. It does not redistribute the upstream source snapshot. Do not repackage upstream source when no standard license file is provided.
- **Remotion Resources** — <https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/resources.mdx>. Catalog entries index external resources and do not imply a shared license.
- **LottieFiles** — <https://lottiefiles.com/>. Catalog entries store external entry points only; this package does not contain animation files downloaded from LottieFiles. Each asset remains subject to its own license.
- **html-video** — Apache-2.0 and upstream attribution details are preserved under `docs/third-party/html-video/`.

## ASR model weights

This repository contains no Whisper or CTranslate2 model weights. After user confirmation, the application downloads a model from the configured source. The model repository determines the weight license, attribution, and terms of use.
