## Why

Tournament hosts submit results to FESA (Fédération Européenne des Associations de Shogi) as plain-text tournament reports. Today they have to assemble the report by hand from the crosstable. The crosstable already holds every fact needed (games, standings, schedule, participants), so a one-click FESA export removes tedious manual work and transcription errors.

## What Changes

- The crosstable section gains a «FESA» download button (`BsDownload` icon) in its footer. The button is rendered only when the tournament status is `finished`.
- Clicking it downloads a plain-text report (CRLF line endings, no trailing newline) named `YYYY-MM-DD {parentEvent.locales.en.title} - {locales.en.title}.txt` (YYYY-MM-DD — the last round's date; the parent part is omitted when the tournament has no parent event):
  - line 1: `[<parent event en title>: <tournament en title>, <location en settlement>]` (parts omitted when absent);
  - line 2: the rounds' date range — `[YYYY-MM-DD]` for a single date, `[YYYY-MM-DD/DD]` within one month, `[YYYY-MM-DD/MM-DD]` within one year, `[YYYY-MM-DD/YYYY-MM-DD]` across years;
  - line 3: `[Time control: {mainTime}min + {increment|byoyomiTime|canadianTime}sec]` (the increment part is omitted for absolute time control);
  - header line: `Nr Name Nat {round numbers}` plus `MMSS Pts MMS` when any participant has non-zero starting points, otherwise `Pts`;
  - one line per participant in the crosstable standings order: `Nr [en familyName] [en givenName] {nationality} [{round cells}]` where each round cell is `{opponent report number}{+|-|=}` — 0 for a bye or forfeit game — plus `({handicap view})` when the game has a handicap; followed by `[startingPoints] {points without starting points} {points including starting points}` when starting points are active (otherwise just the points).
- English locale fields are used (fallback to `ru`); the report is reconstructed on the fly from the tournament data.

## Capabilities

### Modified Capabilities
- `tournament-management`: ADDED requirement — FESA report export from the crosstable section (visibility, file name, report format).

## Impact

- **Affected specs:** `openspec/specs/tournament-management/spec.md` (ADDED FESA report export requirement).
- **Affected code:** new `src/components/tournament/crosstable/fesaReport.ts` (pure builder), `src/components/tournament/CrosstableSection.tsx` (button + download), `src/pages/TournamentPage.tsx` (fesa context), tests `src/test/fesaReport.test.ts`.
