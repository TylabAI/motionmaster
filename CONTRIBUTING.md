# Contributing

[English](CONTRIBUTING.md) · [简体中文](CONTRIBUTING.zh-CN.md)

Thank you for contributing to MotionMaster. Before making a substantial change, open an Issue describing the problem, use case, and expected behavior. Small, focused fixes may be submitted directly as a Pull Request.

## Development workflow

```powershell
npm ci
npm run dev
```

Run these checks before submitting:

```powershell
npm run build
npm test
npm run test:api
npm run test:mcp
```

## Change requirements

- Timeline, caption, and motion-card timing must use integer frames.
- Motion-card animation must be driven by the Remotion frame clock. Do not use wall-clock time or non-deterministic randomness.
- API writes must include `expectedVersion`.
- New cards should provide a schema, defaults, classification, source notes, and a verifiable preview.
- UI changes should be checked in narrow windows, during timeline dragging and keyboard operation, and after reopening a persisted project.
- Never commit models, videos, captions, transcripts, project JSON, rendered output, API keys, or machine-specific paths.

## Commit messages

Start with a short, concrete verb. Examples:

- `Fix playhead selection on timeline cards`
- `Add model status refresh`
- `Document local ASR setup`

Third-party code or assets must include their license, source URL, author, and adaptation notes. Material without clear redistribution permission must not be added to the repository.
