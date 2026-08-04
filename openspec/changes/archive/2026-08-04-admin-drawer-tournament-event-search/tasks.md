## 1. Repository layer

- [x] 1.1 In `src/services/repository.ts`, add `searchByTitle(prefix: string): Promise<Tournament[]>` to the `TournamentRepository` interface.
- [x] 1.2 In `src/services/repository.ts`, add `searchByTitle(prefix: string): Promise<Event[]>` to the `EventRepository` interface.
- [x] 1.3 In `src/services/firestoreTournamentRepository.ts`, implement `searchByTitle` mirroring `FirestorePlayerRepository.searchByFamilyName`: import `limit`, iterate `supportedLocales`, range-query `locales.<locale>.title` (`>=` prefix, `<=` prefix + `\uf8ff`), `orderBy`, `limit(20)`, run in parallel, deduplicate by id.
- [x] 1.4 In `src/services/firestoreEventRepository.ts`, implement `searchByTitle` the same way (import `limit` and `supportedLocales`).

## 2. Service layer

- [x] 2.1 In `src/services/tournamentService.ts`, add `async searchByTitle(prefix: string): Promise<Tournament[]>` as a passthrough to `this.repository.searchByTitle(prefix)`.
- [x] 2.2 In `src/services/eventService.ts`, add `async searchByTitle(prefix: string): Promise<Event[]>` as a passthrough to `this.repository.searchByTitle(prefix)`.

## 3. Search hooks

- [x] 3.1 Create `src/hooks/useTournaments.ts` with `useTournamentSearch(query: string)` hook mirroring `usePlayerSearch` (300ms debounce, `MIN_QUERY_LENGTH = 3`, `staleTime: 30_000`, queryKey `['tournaments', 'search', debouncedQuery]`).
- [x] 3.2 In `src/hooks/useEvents.ts`, add `useEventSearch(query: string)` hook mirroring `usePlayerSearch` (queryKey `['events', 'search', debouncedQuery]`).

## 4. AdminDrawer UI

- [x] 4.1 In `src/components/AdminDrawer.tsx`, add `tournamentSearch` and `eventSearch` state variables.
- [x] 4.2 Call `useTournamentSearch(tournamentSearch)` and `useEventSearch(eventSearch)` hooks; compute `isTournamentSearchActive` (`tournamentSearch.trim().length >= 3`) and `isEventSearchActive` similarly.
- [x] 4.3 In the "Tournaments" section, add a search input (with `BsSearch` icon) above the datepicker.
- [x] 4.4 In the "Tournaments" section, add conditional rendering: when search active, show spinner / "no search results" / search results (reusing `renderTournamentItem`); otherwise keep existing month-filtered list.
- [x] 4.5 In the "Events" section, add a search input above the datepicker.
- [x] 4.6 In the "Events" section, add conditional rendering for search results vs. month-filtered list (reusing the existing event card rendering).
- [x] 4.7 Add `BsSearch` to the `react-icons/bs` import in `AdminDrawer.tsx`.
- [x] 4.8 Add `disabled={isSearchingTournaments}` to the tournament month datepicker and `disabled={isSearchingEvents}` to the event month datepicker, so the datepickers become disabled while search is active (per spec: "the datepicker SHALL be disabled").

## 5. Firestore indexes

- [x] 5.1 In `firestore.indexes.json`, add `fieldOverrides` entries for `locales.ru.title` and `locales.en.title` on `tournaments` collection (ASCENDING, COLLECTION scope).
- [x] 5.2 In `firestore.indexes.json`, add `fieldOverrides` entries for `locales.ru.title` and `locales.en.title` on `events` collection (ASCENDING, COLLECTION scope).

## 6. i18n

- [x] 6.1 In `src/locales/ru/translation.json`, add keys: `searchTournaments`, `searchEvents`, `noSearchResults`.
- [x] 6.2 In `src/locales/en/translation.json`, add the same keys with English values.

## 7. Verification

- [x] 7.1 Run `npm run build` and confirm no type errors.
- [x] 7.2 Update `tournamentService.test.ts` mock repository with `searchByTitle`.