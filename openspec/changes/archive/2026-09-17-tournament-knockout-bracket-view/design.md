# Design

## Context

The knockout pairing assistant already reconstructs canonical brackets from played rounds. This change stores the bracket geometry on the tournament and reuses the reconstruction for a public visual bracket.

## Decisions

### Decision 1: Bracket geometry lives in `settings.hasKnockoutBracket`
**Choice:** `settings.hasKnockoutBracket = { size: int default 0, startRound: int default 0 }` where `size` is the bracket size (power of two, 0 = no bracket) and `startRound` is the tournament round of knockout round 1. Legacy documents parse via the zod default; no migration needed.
**Alternatives considered:** a separate top-level field (pollutes the document for non-knockout tournaments); deriving the geometry from games (ambiguous with embedded brackets — the host knows the intent).

### Decision 2: Sliders over mapped stops
**Choice:** the bracket size slider is an index slider (0..9) mapped to `[0, 4, 8, 16, 32, 64, 128, 256, 512, 1024]` because the stops are not uniform; the start-round slider is a plain range `0..10`. Both live inside a daisyUI collapse so the section stays compact.
**Alternatives considered:** a select dropdown (rejected — the user asked for range sliders); uniform step-4 range (reaches 1024 in 256 steps — unusable).

### Decision 3: Bracket view computed on the fly, not persisted
**Choice:** `buildBracketView` reconstructs the bracket from `games` + geometry on every render (memoizable): canonical start-round configuration search (`matchStartRound`, bounded budget) + bracket-adjacency follow-up (`followBracket`), then projects unplayed rounds down to the final as TBD slots. Returns null when the reconstruction fails.
**Rationale:** no schema/persistence changes beyond the geometry; the same canonical rules as the pairing assistant guarantee the view matches what the host actually plays; reconstruction is O(budget + rounds × size) — instant for any realistic bracket.
**Alternatives considered:** persisting the bracket tree on the tournament (redundant — derivable; would drift from the games).

### Decision 4: Visual bracket as HTML/CSS, not SVG
**Choice:** the bracket renders as horizontally scrollable columns of daisyUI cards (one column per knockout round, classic bracket layout with `justify-around` so paired cards converge), connectors drawn with borders/pseudo-elements; winning lines and winner cards get an accent color; a small winner surname sits above the connector; byes render as single-player cards; unplayed slots render dashed TBD placeholders; the final's winner gets a champion card.
**Rationale:** the content is text (locale-dependent «фамилия, имя» with varying widths, ellipsis, i18n) — native HTML text flow beats SVG text layout; daisyUI styling and accessibility come for free; no coordinate math; scales to large brackets via horizontal scroll.
**Alternatives considered:** SVG lines (pixel-perfect but brittle text measurement and manual layout); SVG lines + HTML overlay (hybrid complexity without benefit).

### Decision 5: Graceful degradation
**Choice:** the tab appears whenever `size > 0`; if `buildBracketView` returns null (rounds do not form the requested bracket — e.g. `startRound` not yet reached or history inconsistent), the tab shows an informational empty state instead of the bracket.
**Rationale:** the host may configure the bracket before the knockout stage starts; the public page must not break.
