# Lint Rules

- `SCHEMA_INVALID`: repair the JSON contract before any write.
- `CARD_ID_DUPLICATE`: generate stable unique card IDs.
- `TRACK_NOT_FOUND`: use a track returned by the project.
- `CARD_OUTSIDE_TIMELINE`: shorten or move the card.
- `TEXT_TOO_LONG`: split the statement or select a structured card.
- `FREE_HEX_COLOR`: replace the color with a semantic `accentRole`.
- `CARD_TOO_FREQUENT`: reduce main-card density.
- `VIDEO_MUST_COVER`: set `media.fit` to `cover`.
- `CARD_TYPE_REPETITION`: replace at least one of three consecutive identical templates.
- `MOTION_VARIETY_LOW`: use at least three visual forms and prevent one template from dominating the main-card track.
- `BRAND_PROFILE_INCOMPLETE`: add the brand name, authoritative source, and logo before a product-oriented arrangement.
- `BRAND_CONTRAST_LOW`: choose brand text and background colors with at least 4.5:1 contrast.

Do not silence a rule unless the user explicitly accepts that exception.

