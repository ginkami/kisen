# Tasks: crosstable-opponent-tooltips

## 1. Component

- [x] 1.1 Add `pointsById` and `gamesByPid` memoized maps to `CrosstableView`
- [x] 1.2 Add internal `OpponentCard` component (flag, rank+crown, name, rating, points badge, result badge) reusing existing imports and card style
- [x] 1.3 Wrap paired-game round cell content in a `tooltip z-50` with `tooltip-content` card; keep bye/forfeit/empty cells unchanged
- [x] 1.4 Wrap participant family name in a tooltip listing per-round opponent cards (forfeit → result-only card, byes omitted)
  - Post-QA fix: `truncate` (`overflow: hidden`) on the name `td` clipped the absolutely-positioned `tooltip-content` bubble so the name tooltip never appeared; truncation moved to the inner name span and the tooltip wrapper became `flex max-w-full`

## 2. Tests

- [x] 2.1 Create `src/test/crosstableView.test.tsx` with native assertions and a react-i18next mock
- [x] 2.2 Cover: cell tooltip card content, result badge colors from the hovered player's perspective (both player1/player2 sides), no tooltip on bye/forfeit/empty cells, name tooltip ordering with forfeit result-only card, name tooltip omitted without opponents

## 3. Verification

- [x] 3.1 Run `npx vitest run src/test/crosstableView.test.tsx` — all green (4/4)
- [x] 3.2 Run full suite `npx vitest run` — 375/376; only the 2 known baseline failures remain (`App.test.tsx`, `useTournamentForm.test.ts` file-level import error). Also fixed a pre-existing committed mismatch in `tournamentResultsSection.test.tsx` (component renders pair number `1.`, test expected `1`)
- [x] 3.3 Run `npx tsc --noEmit` — clean
- [x] 3.4 Run `openspec validate --changes` — no new validation issues
- [x] 3.5 Manual UI check of the «Кросс-таблица» tooltips (dev server), then suggest a commit message
