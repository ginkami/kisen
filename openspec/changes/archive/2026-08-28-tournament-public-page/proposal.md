## Why

Published tournaments exist in Firestore and are reachable by data (AdminDrawer, edit form), but there is no public page to view a tournament: `src/pages/TournamentPage.tsx` is a stub that only echoes the URL param. Visitors (and organizers sharing links) need a read-only tournament page — accessible both by human-readable slug (`/tournaments/{slug}`) and by stable id (`/tournaments/{UUID}`).

## What Changes

- Rewrite `TournamentPage` into a full read-only tournament view served by the existing `/tournaments/:slug` route for both `{UUID}` and `{slug}` params (UUID is a valid slug-shaped param; the page detects which one it got). Only public tournaments (`isPublic == true`) are shown on either address; everything else renders a localized "not found" state.
- Event header block: when the tournament has a `parentEvent`, render the event title as `h1` and a `tabs-lift` panel with links to all public sibling tournaments of the same event, sorted left-to-right by tournament start time (first round start → earliest event → `updatedAt`); the active tab (current tournament) has no link. Without a `parentEvent` the block is skipped and the tournament title becomes `h1`.
- Meta lines block under the title: dates of the tournament (compact range format from the schedule days), flag + country name + settlement, venue (only when set), player count, short time-control format, round count, and the arbiter name.
- Content `tabs-box` tablist (same pattern as the edit form): «Описание» (placeholder), «Расписание» (read-only schedule list sorted by time), «Игроки» (first six crosstable columns, players sorted by rating), «Результаты» (placeholder), «Таблица» (read-only crosstable: standings, per-round result cells without any buttons/inputs; starting-points column only when someone has > 0).
- New pure display utilities: tournament start resolution, schedule-days collection, date-range formatting, short time-control formatting, sibling sorting — all unit-tested.
- i18n keys under `tournament.view.*` (ru/en).

## Capabilities

### New Capabilities

- `tournament-public-page`: read-only public tournament page — routing by UUID/slug with public-only visibility, event header with sibling tournament tabs, tournament meta lines (dates/location/venue/players/time control/rounds/arbiter), and the five content tabs (description placeholder, schedule list, players table, results placeholder, read-only crosstable).

### Modified Capabilities

(none — no existing requirement changes; the edit form, services, repositories, and Firestore rules are untouched)

## Impact

- Pages: `src/pages/TournamentPage.tsx` — full rewrite (stub → view page). Router `src/App.tsx` unchanged.
- New components in `src/components/tournament/view/`: `EventTournamentTabs`, `TournamentMeta`, `TournamentScheduleList`, `PlayersTable`, `CrosstableView`.
- New utils `src/utils/tournamentDisplay.ts` (+ unit tests `src/test/tournamentDisplay.test.ts`); reuses exported `mergeSchedule` from `useTournamentForm.ts` and `computeStandings`/`rankToColor`/`handicapForView` from `crosstableModel.ts`.
- Data: `tournamentService.getById`/`getBySlug`/`list({ parentEvent, isPublic: true })`, `eventService.getById` via TanStack Query; no service or repository changes.
- i18n: new `tournament.view.*` keys in `src/locales/{ru,en}/translation.json`.
- No Firestore rules or index changes (existing queries already covered).
