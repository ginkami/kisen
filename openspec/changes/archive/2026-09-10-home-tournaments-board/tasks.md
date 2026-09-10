## 1. Domain and service layer

- [x] 1.1 Add optional `startAt?: Date` to the tournament schema (`domain/tournament.ts`) and map it in `toFirestore`/`fromFirestore`
- [x] 1.2 Maintain `startAt` (min of rounds/events `scheduledAt`) in `TournamentService.create/update` next to `startYearMonth`; extend the `startYearMonth` util to also return the start date
- [x] 1.3 Add `listPublishedTournaments({ status, country, startFrom, startTo, pageSize, cursor })` to the repository (`limit` + `startAfter`, composite-index constraints) and expose it via `tournamentService`
- [x] 1.4 Add `associationService.getByIds(ids)` (batch lookup, following `userService.getByIds`)

## 2. Indexes and backfill

- [x] 2.1 Add composite indexes to `firestore.indexes.json`: `(isPublic, status, startAt ASC)`, `(isPublic, status, startAt DESC)`, `(isPublic, status, location.country, startAt ASC)`, `(isPublic, status, location.country, startAt DESC)`
- [x] 2.2 Add `scripts/backfill-tournament-start-at.mjs` (client SDK, admin sign-in from env) computing `startAt` for existing documents

## 3. Hooks and UI

- [x] 3.1 Create `src/hooks/usePublicTournaments.ts`: `usePublicTournamentsSection` (useInfiniteQuery, pages of 30, cursor) and `usePublicTournamentCount` (getCountFromServer)
- [x] 3.2 Create `src/components/home/TournamentFiltersForm.tsx`: title search, date range, `CountrySelect`, city input, «Применить»/«Отмена»; fixed panel on wide screens, collapsible on small ones
- [x] 3.3 Create `src/components/home/TournamentCard.tsx` per spec (title/event links, edit icon by rights, meta row, association badge, flag/country/settlement)
- [x] 3.4 Create `src/components/home/PublicTournamentsBoard.tsx`: h1 «Турниры», filter form, `tabs-border` with three tabs and counts, per-section lists, «Показать следующие 30 турниров» buttons; render it from `HomePage`
- [x] 3.5 Add `home.*` i18n keys to `src/locales/ru/translation.json` and `src/locales/en/translation.json`

## 4. Tests

- [x] 4.1 Repository tests: `listPublishedTournaments` constraint building (status/isPublic/order/country/range/limit/cursor) and `startAt` Firestore mapping
- [x] 4.2 `src/test/tournamentCard.test.tsx`: title/event links, edit icon for admin/manager/visitor, meta row
- [x] 4.3 `src/test/homeTournamentsBoard.test.tsx`: tabs with counts, section rendering, «show more» pagination, filter apply/cancel behavior

## 5. Validation

- [x] 5.1 `npx tsc -b` passes
- [x] 5.2 `npx vitest run` all green (630 passed, was 616 baseline + 14 new)
- [x] 5.3 `npx vite build` succeeds
- [x] 5.4 `openspec validate home-tournaments-board` passes

## 6. Manual deployment steps

- [x] 6.1 `firebase deploy --only firestore:indexes`
- [x] 6.2 Run `scripts/backfill-tournament-start-at.mjs` once with admin credentials

