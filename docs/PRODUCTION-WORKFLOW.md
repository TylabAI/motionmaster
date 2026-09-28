# Production Workflow

MotionMaster 1.7 adds a production contract above the existing deterministic timeline and card system. It turns a loose request into four explicit inputs: production mode, narrative recipe, target aspect ratios, and brand profile.

## Production modes

- Talking-head explainer
- Product promo
- Feature launch
- Tutorial
- Data report

Each mode resolves to a narrative recipe. Product promo, for example, suggests brand opening, problem, capability, process, multi-view, ecosystem, evidence, and call to action. These beats guide planning; they are never a requirement to invent unsupported scenes.

## Agent workflow

1. Read `motion_production_catalog`.
2. Read `motion_production_brief` for the project.
3. Read the live card catalog and project version.
4. Bind every proposed scene to real word IDs or explicit frames.
5. Use a supported `recipeId` only when the content supports its purpose.
6. Submit scenes through the existing version-controlled arrangement flow.
7. Run validation and preview every requested aspect ratio.

MotionMaster keeps Remotion and HTML/CSS/SVG animations frame-driven. The workflow does not add GSAP, timers, remote scripts, or a second animation clock.

## Quality gates

Validation warns when a product project lacks brand sources, brand colors have insufficient contrast, one template dominates the timeline, or three consecutive main cards use the same template. These warnings are visible through the HTTP API, MCP, and Studio inspector.

## HTTP endpoints

- `GET /api/production/recipes`
- `GET /api/projects/:id/production-brief`
- `PATCH /api/projects/:id/profile`

Profile writes require `expectedVersion`, so an Agent cannot overwrite a newer human edit.
