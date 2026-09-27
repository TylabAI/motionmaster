# Source package report

Package: `MotionMaster-GitHub-Source-v1.6.2-20260926`

## Included

- MotionMaster application, API, MCP, schema, rendering, semantic-cut and card-pack source code.
- English-first public documentation with Chinese companion files, runtime Chinese/English interface switching, synthetic examples and sanitized bilingual product screenshots.
- MIT license for MotionMaster-owned code and third-party notices.
- GitHub Actions CI, contribution rules and security policy.

## Deliberately excluded

- `runtime/models/` — local ASR model weights.
- `runtime/asr-env/` — Python virtual environment.
- `node_modules/` and compiled `dist/` output.
- `verification/`, internal delivery reports and one-off deployment scripts.
- `projects/`, source video, user subtitles, transcripts, edit decisions and renders.
- API settings, API keys, local absolute paths and service credentials.
- User-project-specific scripts, identifiers and data.
- Third-party upstream source snapshots under `card-packs/vendor/`.

The only `.srt` file in this package is `skills/video-motion-master/examples/sample.srt`, a three-cue synthetic example written for public documentation. It contains no user transcript.

## Validation performed

- `npm ci`: passed; npm reported 0 vulnerabilities.
- `npm run build`: passed.
- `npm test`: 26 files / 113 tests passed, including UI translation coverage.
- `npm run test:api`: passed; 0 project validation issues.
- `npm run test:mcp`: passed; 41 tools and 275 catalog entries detected.
- `npm run doctor`: passed on the packaging host.
- Final source tree scanned for user project names, known project IDs, local user paths, common API key formats, forbidden runtime directories and files over 20 MB.
