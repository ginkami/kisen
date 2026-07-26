## 1. Repository layer — Player interface and Firestore implementation

- [x] 1.1 Add `PlayerRepository` interface to `src/services/repository.ts` with methods: `getById`, `create`, `update`, `delete`, `searchByFamilyName`
- [x] 1.2 Create `src/services/firestorePlayerRepository.ts` implementing `PlayerRepository` with `fromFirestore`/`toFirestore` using `firestoreHelpers.ts`
- [x] 1.3 Implement `searchByFamilyName(prefix, locale)` using Firestore range query (`>= prefix`, `<= prefix + '\uf8ff'`, `limit(20)`)
- [x] 1.4 Add `withDefaultRating` helper in the repository (similar to `withDefaultArbiter` in tournament repo) to handle missing `currentRating` field

## 2. Service layer — PlayerService

- [x] 2.1 Create `src/services/playerService.ts` with `PlayerService` class wrapping `FirestorePlayerRepository`
- [x] 2.2 Export singleton `playerService` instance
- [x] 2.3 Methods: `getById`, `create`, `update`, `delete`, `searchByFamilyName`

## 3. React hook — usePlayerSearch

- [x] 3.1 Create `src/hooks/usePlayers.ts` with `usePlayerSearch(query, locale)` hook
- [x] 3.2 Implement 300ms debounce using `setTimeout`/`useRef` pattern
- [x] 3.3 `useQuery` with `enabled: query.length >= 3`, `staleTime: 30_000`, query key `['players', 'search', locale, query]`

## 4. Routing and placeholder pages

- [x] 4.1 Create `src/pages/PlayerEditPage.tsx` — thin wrapper reading `id` from `useParams`, rendering `PlayerEditForm`
- [x] 4.2 Create `src/components/player/PlayerEditForm.tsx` — placeholder component showing "Player edit form" text
- [x] 4.3 Add routes in `src/App.tsx`: `<Route path="players/new" element={<PlayerEditPage />} />` and `<Route path="players/:id/edit" element={<PlayerEditPage />} />`

## 5. AdminDrawer — Players section

- [x] 5.1 Add "Players" accordion section in `src/components/AdminDrawer.tsx` between "Tournaments" and "Events"
- [x] 5.2 Implement role-based disabled state: `user?.role === 'user'` → `pointer-events-none opacity-50` on the collapse div, `disabled` on the radio input
- [x] 5.3 Add search input with `MagnifyingGlassIcon`, calling `usePlayerSearch` with debounce
- [x] 5.4 Add "+ Player" button navigating to `/players/new` (with unsaved changes confirmation via `ConfirmModal`)
- [x] 5.5 Render search result cards with: familyName, givenName, nationality flag, location, currentRating value/rank
- [x] 5.6 Implement card click → navigate to `/players/:id/edit` with active card highlighting
- [x] 5.7 Add `max-h-96 overflow-y-auto` container for search results

## 6. i18n — Translation keys

- [x] 6.1 Add player-related keys to `src/locales/ru/translation.json`: `admin.players`, `admin.searchPlayers`, `admin.noPlayersFound`, `admin.newPlayer`, `admin.playersDisabled`
- [x] 6.2 Add player-related keys to `src/locales/en/translation.json`

## 7. Firestore indexes

- [x] 7.1 Add field override index for `players` collection, `locales.ru.familyName` (ASCENDING, COLLECTION scope)
- [x] 7.2 Add field override index for `players` collection, `locales.en.familyName` (ASCENDING, COLLECTION scope)

## 8. Verification

- [x] 8.1 Run `npm run lint` — no new errors from my changes (pre-existing warnings only)
- [x] 8.2 Run `npm run test:run` — 39/39 tests pass (App.test.tsx failure is pre-existing)
- [x] 8.3 Manual smoke test: admin panel shows Players section (disabled for user role), search works for admin, placeholder pages render
