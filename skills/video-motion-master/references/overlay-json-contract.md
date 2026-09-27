# Overlay JSON Contract

## Project Fields

- `schemaVersion`: `0.2.0`
- `theme`: `dark` or `light`
- `skin`: `glass` or `solid`
- `style`: `hud` or `editorial`
- `font`: CSS font-family string
- `lintOff`: explicit lint rule codes only
- `media.fit`: always `cover`
- `timeline.segments`: subtitle and scene boundaries
- `timeline.cards`: registered card instances

## Segment

```json
{"segmentId":"seg-001","groupId":"scene-001","startFrame":0,"endFrame":90,"text":"先看完整流程","label":"WORKFLOW","accent":"cyan"}
```

## Card

```json
{"cardId":"card-001","cardType":"section-head","cardVersion":"2.0.0","trackId":"overlay-main","startFrame":0,"durationFrames":90,"content":{"label":"WORKFLOW","title":"先看完整流程"},"layout":{"side":"left","scale":1},"appearance":{"accentRole":"cyan"},"motion":{"enterFrames":18,"exitFrames":12},"sourceSegmentIds":["seg-001"],"seg":"scene-001"}
```

Use `overlay-ambient` only for ambient cards. Use `overlay-main` for readable information cards.

