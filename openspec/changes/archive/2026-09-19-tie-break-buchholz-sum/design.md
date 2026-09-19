# Design

## Context

Add the «Sum of Buchholz» coefficient (BH-BH / СБ) as a new tie-break type and make it the fourth default for new drafts.

## Decisions

### Decision 1: New enum value `buchholz_sum`, parameterless and unique
**Choice:** extend `tieBreakTypeSchema` with `'buchholz_sum'` and the discriminated union with a plain `baseTieBreakSchema.extend({ type: z.literal('buchholz_sum') })` member — no extra parameters.
**Rationale:** BH-BH needs no configuration (unlike `buchholz_cut` with `cutCount`); the add-control picker derives its options from the enum and treats every type except `buchholz_cut` as unique, so no UI changes are needed.
**Alternatives considered:** a parameterized variant (no known federation requirement).

### Decision 2: Two-pass computation with a precomputed BH map
**Choice:** when `buchholz_sum` is present, compute each participant's Buchholz in a first pass (`bhByParticipant` map, mirroring the direct-encounter pattern), then per row sum the BH values of the faced opponents.
**Rationale:** BH of an opponent cannot be derived from `pointsMap` alone; precomputation keeps the per-row pass O(opponents) and reuses `calcBuchholz` as the single source of BH semantics (same round/bye/forfeit filtering).
**Alternatives considered:** computing opponents' BH on demand per game (quadratic, duplicate logic).

### Decision 3: BH-BH as the fourth default, after Sonneborn-Berger
**Choice:** `defaultSettings()` returns `points → buchholz → sonneborn_berger → buchholz_sum`.
**Rationale:** user-confirmed ordering — BH-BH supplements the classic trio without displacing Sonneborn-Berger.
**Alternatives considered:** replacing Sonneborn-Berger (rejected by the user).
