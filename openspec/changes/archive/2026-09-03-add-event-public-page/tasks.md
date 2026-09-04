## 1. Utilities

- [x] 1.1 Add pure helper `latestTournament(list)` to `src/utils/tournamentDisplay.ts` (max of `tournamentStart`, tie-break by id) with unit tests in `src/test/tournamentDisplay.test.ts` (latest by start, tie-break, single/empty list).

## 2. TournamentPage refactor

- [x] 2.1 Add optional `tournamentId?: string` prop to `TournamentPage`: when present, query `tournamentService.getById(tournamentId)` with key `['tournament', 'view', 'id', tournamentId]`; when absent, keep existing `useParams` sniffing behavior unchanged.

## 3. Event description section

- [x] 3.1 Create `src/components/event/EventDescriptionSection.tsx`: event description + all `event.regulations` descriptions (locale → ru fallback per chunk, `regulationService.getById` via `useQueries`), rendered via `MarkdownCollapsibleSections`; render nothing when empty.

## 4. Event page + routing + i18n

- [x] 4.1 Create `src/pages/EventPage.tsx`: UUID-sniffing of `:slug` → `eventService.getById`/`getBySlug`; `h1` localized title cascade (`locale → ru → slug`); loading spinner / load-error / not-found states; `document.title` from `event.view.pageTitle`; branch on `tournamentService.list({ parentEvent, isPublic: true })` — render `<TournamentPage tournamentId={latest.id} />` when public tournaments exist (event `h1` + spinner while loading), otherwise `EventDescriptionSection`.
- [x] 4.2 Add route `events/:slug` → `EventPage` in `src/App.tsx` (after static `events/new` / `events/:id/edit`).
- [x] 4.3 Add `event.view.{pageTitle,notFound,errors.load}` keys to `src/locales/ru/translation.json` and `src/locales/en/translation.json`.

## 5. Tests

- [x] 5.1 Create `src/test/eventPage.test.tsx` with mocked services: by-UUID and by-slug lookup, not-found, load error, description branch (order: description then regulations, locale fallback, empty event renders h1 only), tournament branch (latest by start rendered in place via TournamentPage, tie-break, loading state shows event h1 + spinner), `document.title` set to event title in both branches.
- [x] 5.2 Verify existing `TournamentPage` tests still pass unchanged after the `tournamentId` prop refactor.

## 6. Verification

- [x] 6.1 Run `npx tsc -b`, `npx vitest run`, `npx vite build` — all green. (Note: `src/test/tournamentResultsSection.test.tsx` fails on HEAD, pre-existing and unrelated to this change — it imports only `TournamentResultsSection`/`pairingsModel`; `tsc -b` clean, build succeeds, all other 481 tests pass.)
- [x] 6.2 Run `openspec validate add-event-public-page` — passes.
