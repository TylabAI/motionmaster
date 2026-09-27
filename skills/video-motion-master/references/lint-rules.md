# Lint Rules

- `SCHEMA_INVALID`: repair the JSON contract before any write.
- `CARD_ID_DUPLICATE`: generate stable unique card IDs.
- `TRACK_NOT_FOUND`: use a track returned by the project.
- `CARD_OUTSIDE_TIMELINE`: shorten or move the card.
- `TEXT_TOO_LONG`: split the statement or select a structured card.
- `FREE_HEX_COLOR`: replace the color with a semantic `accentRole`.
- `CARD_TOO_FREQUENT`: reduce main-card density.
- `VIDEO_MUST_COVER`: set `media.fit` to `cover`.

Do not silence a rule unless the user explicitly accepts that exception.

