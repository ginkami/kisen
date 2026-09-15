## 1. Display utilities (`src/utils/tournamentDisplay.ts`, new)

- [x] 1.1 Implement `tournamentStart(t)`: `scheduledAt` of the round with the minimum number → earliest `schedule.events[].scheduledAt` → `updatedAt`.
- [x] 1.2 Implement `tournamentScheduleDays(t)`: unique calendar days from all rounds + events; fallback `[updatedAt]` when both are empty.
- [x] 1.3 Implement `formatDayRanges(days, locale)`: unique days sorted ascending → maximal consecutive-day runs → `d` / `d1–d2` joined with `", "`; month name appended when the month changes between printed groups; year once at the end; names via `Intl.DateTimeFormat`.
- [x] 1.4 Implement `formatTimeControlShort(tc, t)`: absolute (no extra part); fischer/bronstein/delay `+ {increment} секунд`; byoyomi `+ {byoyomiTime} секунд × {byoyomiPeriods}`; canadian `+ {canadianTime} секунд / {canadianMoves} ходов`; type names from `tournament.timeControl.*`; «минут/минуты» via i18next count plurals.
- [x] 1.5 Implement `sortTournamentsByStart(list)`: ascending by `tournamentStart`, stable.
- [x] 1.6 Create `src/test/tournamentDisplay.test.ts`: `formatDayRanges` (single day, consecutive range, gaps, month change, cross-month range, cross-year), `tournamentStart` (round → event → updatedAt cascade), `tournamentScheduleDays` (dedup + fallback), `formatTimeControlShort` (all 6 types, ru/en), `sortTournamentsByStart` (ordering + stability).

## 2. View components (`src/components/tournament/view/`, new)

- [x] 2.1 `EventTournamentTabs.tsx`: `tabs tabs-lift` panel (horizontally scrollable), one tab per public sibling sorted by `sortTournamentsByStart`; non-active tabs are `<Link to={'/tournaments/' + slug}>` with the localized tournament title; the active tab renders without a link.
- [x] 2.2 `TournamentMeta.tsx`: seven meta lines with icons — dates (`BsCalendar3` + `formatDayRanges(tournamentScheduleDays(t))`), flag + `getCountryName(location.country, locale)` + settlement (with locale fallback), venue (`BsGeoAlt`, line rendered only when non-empty), participants count (`FaUsers`), short time control (`BsHourglassSplit`), round count (`BsPlayFill`), arbiter «familyName, givenName» (`PiGavelLight`).
- [x] 2.3 `TournamentScheduleList.tsx`: read-only list from exported `mergeSchedule(t.schedule.events, t.schedule.rounds)`; each row = formatted local datetime (`Intl.DateTimeFormat` in current locale) + «Тур {n}» badge or localized event title.
- [x] 2.4 `PlayersTable.tsx`: first six crosstable columns (№ row number, nationality flag tooltip, rank badge + crown tooltip, «familyName, givenName», location + residence flag, rating); input is domain `Participant[]`; sorted by `capturedRating.value ?? -Infinity` descending, tie-break by family name; no controls.
- [x] 2.5 `CrosstableView.tsx`: read-only crosstable via `computeStandings` + `rankToColor` + `handicapForView`; sticky columns as in `CrosstableSection`; round cells as `<span>`s (result symbol + opponent place, sente mark when `considerSente`, handicap badge); starting-points column (read-only text) only when someone has `startingPoints > 0`; tie-break columns identical to the edit table.

## 3. Page + i18n

- [x] 3.1 Rewrite `src/pages/TournamentPage.tsx`: UUID regex sniffing of the `:slug` param → `getById` / `getBySlug`; queries `['tournament','view',param]`, `['event','byId',parentEvent]`, `['tournaments','siblings',parentEvent]` (the latter two enabled only with `parentEvent`, siblings via `list({ parentEvent, isPublic: true })`); `isPublic === true` gate → localized not-found state; loading spinner; load-error alert; `document.title` from `tournament.view.pageTitle`.
- [x] 3.2 Page layout: `parentEvent` set → `h1` event title (fallback `event.slug`), `EventTournamentTabs`, `h2` tournament title; otherwise `h1` tournament title; then `TournamentMeta`, `tabs tabs-box` tablist (Описание/Расписание/Игроки/Результаты/Таблица with `BsJournalText`/`RiCalendarScheduleFill`/`FaUsers`/`Bs123`/`BsGrid3X2`), conditional sections («Описание» and «Результаты» empty placeholders).
- [x] 3.3 i18n: add `tournament.view.*` keys to `src/locales/ru/translation.json` and `src/locales/en/translation.json` — `pageTitle`, `notFound`, `errors.load`, `tabs.{description,schedule,players,results,crosstable}`, `roundsCount` (plural), `playersCount` (plural), `minutes`/`seconds` (plural), `perMoves`, `untitled` (reuse `admin.untitledTournament` as fallback for titles).

## 4. Verification

- [x] 4.1 Run `npx tsc --noEmit` — no type errors.
- [x] 4.2 Run `npx vitest run` — all tests green (new `tournamentDisplay.test.ts` + no regressions).
- [x] 4.3 Manual smoke check in the dev app: open a public tournament by slug and by UUID; open a draft by UUID (not-found state); event header with siblings + active tab; standalone tournament; meta lines (dates formats, venue absent/present); all five tabs; players sorted by rating; crosstable read-only with/without starting points.
