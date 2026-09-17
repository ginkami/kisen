# Tasks

## 1. Engine and UI

- [x] 1.1 New `src/components/tournament/crosstable/fesaReport.ts`: pure `buildFesaReport` (header lines, date range, time control, per-round cells with opponent numbers/bye/forfeit/handicap, SP-conditional columns, file name) — null when the tournament is not finished
- [x] 1.2 `CrosstableSection.tsx`: optional `fesa` prop; «FESA» download button (BsDownload) in the footer, rendered only when `isFinished`; download via Blob + anchor
- [x] 1.3 `TournamentPage.tsx`: assemble the fesa context (status, en titles, settlement, time control, round dates)

## 2. Tests

- [x] 2.1 `src/test/fesaReport.test.ts`: byte-exact checks against the three reference reports (parent event + starting points + handicaps; no parent/no SP; two-month date range)

## 3. Validation

- [x] 3.1 `tsc -b`, `vitest run`, `openspec validate tournament-fesa-report` pass
