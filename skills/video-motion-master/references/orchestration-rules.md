# Orchestration Rules

## Selection

- Chapter or topic switch: `section-head`, `milestone-line`, `process-steps`.
- Number or percentage: `metric-focus`, `radial-gauge`, `stat-grid`, `mini-chart`.
- Contrast or correction: `comparison-bars`, `before-after`, `strike-flip`, `three-column`.
- Viewpoint or quote: `quote-lines`, `kinetic-words`, `callout-note`, `conclusion-card`.
- Structured explanation: `info-board`, `ranking-list`, `checklist`.
- Speaker identity: `lower-third`.
- Atmosphere only: `ambient-wash` on `overlay-ambient`.

## Density

- Use one main card per argument by default.
- Leave at least 12 frames between unrelated main cards.
- Prefer graphical cards over long text panels.
- Keep main titles below 48 Chinese characters.
- Alternate left and right placement; never cover the center speaker safe zone.

## Scene Grouping

- Assign one `groupId` per argument scene.
- Copy the group ID into every linked card’s `seg`.
- Use `dimAt` only to intentionally reduce a card after its key moment.

