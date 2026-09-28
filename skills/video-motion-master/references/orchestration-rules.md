# Orchestration Rules

## Selection

Resolve the project production brief first. Use its scene sequence as a planning guide, and assign `recipeId` only when the spoken or supplied evidence supports that scene purpose. A sequence is not a quota.

- Chapter or topic switch: `section-head`, `milestone-line`, `process-steps`.
- Number or percentage: `metric-focus`, `radial-gauge`, `stat-grid`, `mini-chart`.
- Contrast or correction: `comparison-bars`, `before-after`, `strike-flip`, `three-column`.
- Viewpoint or quote: `quote-lines`, `kinetic-words`, `callout-note`, `conclusion-card`.
- Structured explanation: `info-board`, `ranking-list`, `checklist`.
- Speaker identity: `lower-third`.
- Atmosphere only: `ambient-wash` on `overlay-ambient`.
- Product promo: vary brand opening, problem, capability, process, proof, and CTA forms; omit unsupported beats.
- Tutorial: bind each step to measured words and show a visible check or outcome when the source supports it.
- Data report: every number must come from a named source, transcript, or project data.

## Density

- Use one main card per argument by default.
- Leave at least 12 frames between unrelated main cards.
- Prefer graphical cards over long text panels.
- Keep main titles below 48 Chinese characters.
- Alternate left and right placement; never cover the center speaker safe zone.
- Do not use the same `cardType` three times consecutively. Across five or more main cards, use at least three visual forms and keep any single type below 60%.
- Respect the brand colors, font, corner radius, icon style, and forbidden styles in the production brief.
- Preview each target aspect ratio with layout reflow; never stretch a 16:9 composition into a vertical canvas.

## Scene Grouping

- Assign one `groupId` per argument scene.
- Copy the group ID into every linked card’s `seg`.
- Use `dimAt` only to intentionally reduce a card after its key moment.

