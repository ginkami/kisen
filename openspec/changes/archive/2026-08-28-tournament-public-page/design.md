## Context

The public tournament route `/tournaments/:slug` exists in `src/App.tsx:39` but renders only a stub (`src/pages/TournamentPage.tsx` echoes the URL param). All display logic that the page needs already exists in some form:

- Data access: `tournamentService.getById` / `getBySlug` (slug lookup already filters `isPublic == true` in `firestoreTournamentRepository.getBySlug`) / `list({ parentEvent, isPublic: true })`; `eventService.getById`.
- Schedule merging and sorting: exported `mergeSchedule(events, rounds)` in `useTournamentForm.ts`.
- Standings and presentation atoms: `computeStandings`, `rankToColor`, `handicapForView` in `src/components/tournament/crosstable/crosstableModel.ts`; the editable table itself is `CrosstableSection.tsx` (sticky columns, flag/rank/name/location/rating cells).
- Flag icons: `country-flag-icons` pattern used by `CountrySelect` and `CrosstableSection`; country names via `getCountryName(code, lang)`.
- Time control types: discriminated union in `src/domain/timeControl.ts` with i18n names under `tournament.timeControl.*`.

UUIDv7 ids are valid `:slug` route params, so both `/tournaments/{UUID}` and `/tournaments/{slug}` hit the same route without router changes.

## Goals / Non-Goals

**Goals:**

- A read-only tournament page reachable by both UUID and slug, showing only public tournaments on either address.
- Event header (h1 + sibling tournament tabs) for tournaments bound to a `parentEvent`.
- A compact meta block: dates, location, venue, player count, time control, round count, arbiter.
- Five content tabs: description (placeholder), schedule list, players table (rating-sorted), results (placeholder), read-only crosstable.
- Pure, unit-tested display utilities for date ranges, tournament start, time control, and sibling sorting.

**Non-Goals:**

- No editing capabilities, no auth-gated actions, no admin controls on this page.
- No router, service, repository, or Firestore rules changes.
- No new queries/indexes; no description and results tab content (explicit placeholders for future changes).
- No SEO/prerendering work; no canonical URL redirect from UUID to slug.

## Decisions

### 1. One route, param sniffing — no router changes

`/tournaments/:slug` already matches both `{UUID}` and `{slug}` (UUIDs are slug-shaped). `TournamentPage` tests the param against a UUID regex: match → `getById(param)`, otherwise → `getBySlug(param)`.

*Rationale:* zero router surface change; the edit route `tournaments/:id/edit` is unaffected.

*Visibility gate:* `getBySlug` filters `isPublic == true` in the repository. `getById` does not — the page therefore checks `tournament.isPublic === true` after loading and renders the same localized "not found" state otherwise. This was an explicit product decision: both addresses are public-only (no unlisted draft links, no per-role logic on the public page).

*Alternative rejected:* UUID as unlisted link for organizers — rejected by the product owner; per-role checks (author/admin) also rejected to keep the page fully static data-wise.

*Alternative rejected:* redirect UUID → slug URL for canonical links — adds navigation complexity for no MVP benefit; the URL stays as entered.

### 2. Three TanStack Query requests

- `['tournament', 'view', param]` → `getById` / `getBySlug` depending on sniffing.
- `['event', 'byId', parentEvent]` → `eventService.getById` (same pattern as `BindingSection`), enabled when `parentEvent != null`.
- `['tournaments', 'siblings', parentEvent]` → `tournamentService.list({ parentEvent, isPublic: true })`, enabled when `parentEvent != null`; siblings sorted client-side.

*Rationale:* the sibling list is a fresh concern for the public page; a dedicated query keeps the page composable and cacheable. Sorting happens client-side via the shared start-time utility.

### 3. Pure display utilities in `src/utils/tournamentDisplay.ts`

- `tournamentStart(t)`: scheduledAt of the round with the minimum number → else earliest `schedule.events[].scheduledAt` → else `updatedAt`.
- `tournamentScheduleDays(t)`: unique calendar days from all rounds + events; fallback `[updatedAt]`.
- `formatDayRanges(days, locale)`: unique days sorted ascending → maximal runs of consecutive calendar days → each run renders `d` (len 1) or `d1–d2` (len > 1); runs joined with `", "`; month name appended when the month changes between printed groups; year appended at the end. Produces: «10 августа 2026», «10–11 августа 2026», «10, 12, 25 августа 2026», «10, 12 августа, 3 сентября 2026», «25 августа – 5 сентября 2026». Names via `Intl.DateTimeFormat` with the current UI locale.
- `formatTimeControlShort(tc, t)`: `«{main} минут + {extra} секунд (Тип)»` — absolute: no extra part; fischer/bronstein/delay: `+ {increment} секунд`; byoyomi: `+ {byoyomiTime} секунд × {byoyomiPeriods}`; canadian: `+ {canadianTime} секунд / {canadianMoves} ходов`. Type names reuse `tournament.timeControl.*` keys; «минут/минуты» pluralization via i18next `count` plurals.
- `sortTournamentsByStart(list)`: ascending by `tournamentStart`, stable.

*Rationale:* pure functions → trivially unit-testable (the date-range format is the riskiest piece); reused by the sibling tabs and the meta block.

### 4. Read-only components in `src/components/tournament/view/`

`EventTournamentTabs`, `TournamentMeta`, `TournamentScheduleList`, `PlayersTable`, `CrosstableView`. All accept **domain types** (`Tournament`, `Participant[]`), never `ParticipantRow` from the form hook.

- *Schedule list:* reuses exported `mergeSchedule` (already sorts by time); rows render a formatted datetime + «Тур N» badge or localized event title.
- *Players table:* first six columns of the crosstable (№, flag, rank badge, name, location + residence flag, rating); № is the **row number** (places are not meaningful before/during a tournament); sorted by `capturedRating.value ?? -Infinity` descending, tie-break by family name.
- *Crosstable:* a separate read-only component instead of a `readOnly` prop on `CrosstableSection` — avoids regression risk in the battle-tested edit form; standings/rank/handicap logic is already shared via `crosstableModel`. Cells are `<span>`s (result symbol + opponent place, sente mark ☗/☖, handicap badge); the starting-points column renders read-only text and only when `participants.some(p => (p.startingPoints ?? 0) > 0)`; tie-break columns identical to the edit table.

*Alternative rejected:* refactoring `CrosstableSection` with a `readOnly` prop — touches the edit form for a purely additive feature; revisit if the two tables drift apart later.

### 5. Page layout and i18n

Page shell mirrors the edit form: `mx-auto max-w-7xl space-y-6`, loading spinner, error alert, `document.title` via `tournament.view.pageTitle`. Header: `h1` = event title + `tabs tabs-lift` sibling panel + `h2` = tournament title when `parentEvent` is set; otherwise `h1` = tournament title and the block is skipped. Content tablist uses the same `tabs tabs-box` markup as `TournamentEditForm:1132`. New keys live under `tournament.view.*` in both locale files.

## Risks / Trade-offs

- [Sibling list fetch adds a third query on every page load] → small payloads, cached by TanStack Query; only fetched when `parentEvent` is set.
- [Date-range formatting edge cases (month/year boundaries, single-day runs)] → covered by exhaustive unit tests of `formatDayRanges` including cross-year ranges.
- [Time zone drift: dates stored as UTC instants but displayed as local calendar days] → accepted: same behavior as the edit form; the browser locale defines the calendar day.
- [Duplicated table markup between `CrosstableSection` and `CrosstableView`] → conscious duplication to protect the edit form; the shared logic stays in `crosstableModel`.
- [Draft tournament opened by UUID shows "not found" to its author] → accepted product decision (organizers use `/tournaments/{id}/edit`); may be revisited with a "preview" feature later.

## Migration Plan

1. Ship utilities + components + page rewrite in one change; the route already exists, so no deploy coordination.
2. Rollback: revert the deploy — the stub page comes back; no data or schema changes involved.

## Open Questions

- None blocking. (Resolved during planning: UUID access is public-only; no UUID→slug redirect; byoyomi/canadian short formats; players-table № = row number; description/results tabs are placeholders.)
