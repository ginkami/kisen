## Why

The admin drawer's "Tournaments" and "Events" sections currently only allow filtering by month via a datepicker. When a user has many tournaments or events across different months, finding a specific one by title requires switching months repeatedly. A server-side title search (matching the existing player search pattern) would let users quickly find any tournament or event regardless of its month, improving navigation efficiency in the admin panel.

## What Changes

- Add a server-side `searchByTitle` method to both `TournamentRepository` and `EventRepository` interfaces and their Firestore implementations, mirroring the existing `searchByFamilyName` pattern in `FirestorePlayerRepository` (range queries on `locales.<locale>.title` across all supported locales, deduplication by id, limit 20).
- Expose `searchByTitle` through `TournamentService` and `EventService`.
- Create `useTournamentSearch` and `useEventSearch` hooks with debounce (300ms) and minimum query length (3 characters), mirroring `usePlayerSearch`.
- Add a search input field above the datepicker in both the "Tournaments" and "Events" sections of `AdminDrawer`. When the search field contains 3+ characters, the datepicker becomes disabled and matching cards (searched across all locales) are displayed. When the search field is empty or has fewer than 3 characters, the month-based datepicker filtering remains active.
- Add Firestore indexes for `locales.ru.title` and `locales.en.title` on both `tournaments` and `events` collections in `firestore.indexes.json`.
- Add i18n keys for search placeholders and "not found" messages in both `ru` and `en` translations.

## Capabilities

### New Capabilities
<!-- No new capabilities; the search feature extends existing tournament and event management. -->

### Modified Capabilities
- `tournament-management`: Adds a server-side title search capability for tournaments, accessible from the admin drawer.
- `event-management`: Adds a server-side title search capability for events, accessible from the admin drawer's Events section. Extends the existing "Events section in admin drawer" requirement with search behavior.

## Impact

- **Repositories**: `src/services/repository.ts` (interfaces), `src/services/firestoreTournamentRepository.ts`, `src/services/firestoreEventRepository.ts` (implementations) — new `searchByTitle` method.
- **Services**: `src/services/tournamentService.ts`, `src/services/eventService.ts` — new passthrough methods.
- **Hooks**: New `src/hooks/useTournaments.ts` and/or `src/hooks/useEvents.ts` (or additions to existing hook files) — debounced search hooks.
- **UI**: `src/components/AdminDrawer.tsx` — search inputs, conditional rendering, datepicker disabling.
- **Firestore indexes**: `firestore.indexes.json` — new `fieldOverrides` for `locales.*.title` on `tournaments` and `events`.
- **i18n**: `src/locales/ru/translation.json`, `src/locales/en/translation.json` — new keys.
- **No changes** to domain models, Firestore rules (`read: if true` already covers search queries), or schemas.