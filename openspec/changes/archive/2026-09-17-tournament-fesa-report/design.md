# Design

## Context

FESA (Fédération Européenne des Associations de Shogi) collects plain-text tournament reports. The crosstable already holds all facts; the export is a pure transformation.

## Decisions

### Decision 1: Pure builder module
**Choice:** `fesaReport.ts` exports `buildFesaReport(input): { fileName, content } | null` — a pure function over the tournament data (titles, settlement, time control, round dates, participants, games, standings). The section only triggers the browser download.
**Rationale:** byte-exact testability against reference reports; no Firestore or UI concerns inside the format logic.

### Decision 2: Date range and file name from `scheduledAtLocal`
**Choice:** round dates come from `scheduledAtLocal` (fall back to the UTC date of `scheduledAt`); the range is rendered as `[start]`, `[start/DD]` (same month), `[start/MM-DD]` (same year), `[start/YYYY-MM-DD]` (across years). The file name uses the last round's date.
**Rationale:** matches the reference reports (single day, same-month range, two-month range).

### Decision 3: Starting-points columns are conditional
**Choice:** when any participant has non-zero starting points the header gains `MMSS Pts MMS` and every row gains `[startingPoints] {points without SP} {points with SP}`; otherwise the rows end with a single `Pts` value. `points with SP` is the crosstable standing's points (already includes starting points); `points without SP = points − startingPoints`.
**Rationale:** reproduces the reference reports byte-for-byte; SP-less tournaments keep the compact format.

### Decision 4: English fields with ru fallback
**Choice:** the report uses `locales.en` names/titles with a `ru` fallback (a FESA report is an English-language document; missing translations must not produce empty rows).
**Rationale:** FESA is a European federation; ru fallback keeps the export usable for partially translated tournaments.

## Migration Notes

- The crosstable section gains an optional `fesa` prop; other call sites are unaffected.
