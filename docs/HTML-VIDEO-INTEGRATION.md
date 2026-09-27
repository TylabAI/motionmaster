# HTML Video 与 MotionMaster 集成

来源：https://github.com/nexu-io/html-video
研究版本：c414ecc07f795add03807d5d9ce4baefd807cea2（2026-09-18）
上游 Apache-2.0；上游 LICENSE、ATTRIBUTIONS 原文保留于 third-party/html-video，包含设计灵感来源说明；不表示相关设计工作室背书。

采用内容/样式分离、单卡片迭代、可编程 HTML 与逐帧时间驱动思想。全部模板以 MotionMaster 原生 React/SVG 重建，未原样运行上游模板或引入外部字体、素材、音频。自定义 HTML 通过受约束桥接运行；不声称支持任意网页和上游 GSAP 源码。

## 全部模板映射

上游目录 → MotionMaster cardType：

- frame-bold-poster → hv-frame-bold-poster
- frame-bold-signal → hv-frame-bold-signal
- frame-build-minimal → hv-frame-build-minimal
- frame-creative-voltage → hv-frame-creative-voltage
- frame-data-chart-nyt → hv-frame-data-chart-nyt
- frame-data-rollup → hv-frame-data-rollup
- frame-decision-tree → hv-frame-decision-tree
- frame-electric-studio → hv-frame-electric-studio
- frame-glitch-title → hv-frame-glitch-title
- frame-kinetic-type → hv-frame-kinetic-type
- frame-light-leak-cinema → hv-frame-light-leak-cinema
- frame-liquid-bg-hero → hv-frame-liquid-bg-hero
- frame-logo-outro → hv-frame-logo-outro
- frame-nyt-graph → hv-frame-nyt-graph
- frame-pentagram-stat → hv-frame-pentagram-stat
- frame-play-mode → hv-frame-play-mode
- frame-product-promo → hv-frame-product-promo
- frame-product-promo-30s → hv-frame-product-promo-30s
- frame-swiss-grid → hv-frame-swiss-grid
- frame-takram-organic → hv-frame-takram-organic
- frame-vignelli → hv-frame-vignelli
- frame-warm-grain → hv-frame-warm-grain
- vfx-text-cursor → hv-vfx-text-cursor

源码：card-packs/starter/src/html-video-catalog.ts、HtmlVideoCard.tsx、HtmlMotionCard.tsx；接口约定见 agent-integration.md。具体参数按属性面板编辑。数据输入“名称|数值”，树输入“ID|父ID|文字”（根父 ID 为 -）。自定义 HTML 的可编辑字段由 spec.fields 声明。

内容依然由 MotionMaster 项目管理。保留既有视频/字幕/初剪/时间轴/布局/导出体系；不并入上游整套 CLI、付费音乐供应商、14 个本地 Agent 驱动器或新的录屏导出路径。通用 HTTP/MCP 允许其他 Agent 直接接入。
