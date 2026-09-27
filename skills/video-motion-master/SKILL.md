---
name: video-motion-master
description: Orchestrate talking-head motion graphics from SRT through the local Motion Studio MCP. Use when a user asks to generate, revise, lint, apply, preview, render, or export overlay JSON for MotionMaster projects, especially when the AI must select existing registered cards instead of writing animation code.
---

# Video Motion Master

Turn subtitles into a version-safe Motion Project by selecting registered cards, not by generating animation source code.

## Required Workflow

1. Call `motion_system_probe`. Stop and explain the missing local dependency if the MCP is unavailable.
2. Call `motion_card_catalog`. Treat this result as the only allowed card vocabulary.
3. Call `motion_project_get` and retain its current `version` as `expectedVersion`.
4. Read the SRT and first form a segment plan: one argument, one short English label, and one semantic accent per segment.
5. Produce cards using the contract in `references/overlay-json-contract.md` and the selection rules in `references/orchestration-rules.md`.
6. Prefer `motion_srt_import` for the deterministic baseline. Use `motion_plan_apply` only when an explicit curated card plan is required.
7. Call `motion_project_validate`. Fix errors; fix warnings unless the user explicitly adds the rule code to `lintOff`.
8. On `VERSION_CONFLICT`, read the project again and merge around human edits. Never overwrite with a stale version.
9. Call `motion_preview_render` and inspect the returned start/middle/end artifacts before claiming the project is ready.
10. Call `motion_alpha_render` only after lint passes and the user requests delivery.

## Hard Rules

- Never write React, CSS, GSAP, Remotion, or animation code during orchestration.
- Never invent a `cardType`; use the current MCP catalog.
- Use only semantic accents: `coral`, `cyan`, `lime`, `amber`.
- Keep the speaker safe zone clear by alternating `layout.side` and using registered defaults.
- Keep animations deterministic. Do not introduce timers, true randomness, or URL-encoded project payloads.
- Keep `media.fit` set to `cover`.
- Group cards with `seg` and segments with `groupId` so a scene can move as one block.
- Preserve `skin`, `style`, `font`, `lintOff`, and manually edited cards unless the user asks to replace them.

## Card Catalog

Read `references/card-catalog.md` for the bundled core-card snapshot. Prefer the live `motion_card_catalog` response because it includes every installed card pack. Refresh the snapshot with `node scripts/sync-card-catalog.mjs` while Motion Studio is running.

## Validation

Read `references/lint-rules.md` when lint fails. Use `node scripts/verify-overlay.mjs <overlay-json>` for a portable preflight when MCP is not yet connected.
