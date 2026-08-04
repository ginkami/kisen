## Context

The admin drawer (`src/components/AdminDrawer.tsx`) is the primary navigation panel for tournament and event management. Its "Tournaments" and "Events" sections currently only support filtering by month via a datepicker. The existing player search (`PlayerSearchPanel` + `usePlayerSearch` + `FirestorePlayerRepository.searchByFamilyName`) demonstrates an established server-side search pattern using Firestore range queries on nested locale fields. This change replicates that pattern for tournament and event titles.

## Goals / Non-Goals

**Goals:**
- Enable server-side title search for tournaments and events from the admin drawer
- Search across all supported locales (`ru`, `en`)
- Maintain consistent UX with the existing player search (debounce, min 3 characters, max 20 results)
- Reuse the proven Firestore range-query pattern from `searchByFamilyName`

**Non-Goals:**
- Full-text search (only prefix matching via range queries)
- Search on public-facing pages (only the admin drawer)
- Client-side filtering (requires loading the entire collection)
- Changing the datepicker-based month filtering (it remains the default when search is inactive)
- Adding search to the "Players" or "Associations" sections (they already have search)

## Decisions

### Decision 1: Firestore range queries on `locales.<locale>.title`

**Rationale:** This is the exact pattern used by `FirestorePlayerRepository.searchByFamilyName` (lines 87-123 of `firestorePlayerRepository.ts`). For each supported locale, issue a query with `where('locales.<locale>.title', '>=', prefix)` and `where('locales.<locale>.title', '<=', prefix + '\uf8ff')`, run all locale queries in parallel, deduplicate by document id, cap at 20 results.

**Alternatives considered:**
- *Client-side filtering* (load all via `listByCreator`): Rejected by user — must search the entire collection, not just the user's records, and must match the player search pattern.
- *Algolia/External search service*: Overkill for MVP, adds external dependency.
- *Array of title keywords field*: Requires data migration and denormalization.

### Decision 2: Hook placement

- `useTournamentSearch` → new file `src/hooks/useTournaments.ts` (no existing `useTournaments.ts`; tournaments are currently queried inline in `AdminDrawer`)
- `useEventSearch` → existing `src/hooks/useEvents.ts` (alongside `useEventsForMonth`)

Both hooks mirror `usePlayerSearch` exactly: 300ms debounce, `MIN_QUERY_LENGTH = 3`, `staleTime: 30_000`, queryKey pattern `['<entity>', 'search', debouncedQuery]`.

### Decision 3: UI — datepicker disabling

When search field has 3+ characters (`isSearchActive`), the month datepicker receives `disabled={true}` and a visual `opacity-50` class. The results area switches from month-filtered list to search results. When search clears below 3 characters, datepicker re-enables and month-filtered list returns.

**Rationale:** Prevents conflicting filters (month + text) and makes the active mode visually obvious.

### Decision 4: No Firestore Rules changes

Tournaments (`allow read: if true`) and events (`allow read: if true`) are already fully readable by authenticated users. The range queries operate on existing fields. No rules modification needed.

### Decision 5: Index configuration

Add `fieldOverrides` entries in `firestore.indexes.json` for `locales.ru.title` and `locales.en.title` on both `tournaments` and `events` collections, mirroring the existing player overrides for `locales.ru.familyName` / `locales.en.familyName`.

## Risks / Trade-offs

- **[N parallel Firestore queries per search]** → With 2 supported locales, each search fires 2 queries. Acceptable for MVP scale; the player search already does this. Mitigation: debounce (300ms) and `staleTime: 30_000` caching.
- **[Range query cost grows with collection size]** → Prefix matching scans a range. Mitigation: `limit(20)` per locale query keeps read costs bounded.
- **[Draft tournaments included in search]** → `searchByTitle` queries the entire collection, including other users' drafts. However, Firestore rules restrict read access: tournaments are `allow read: if true` (all readable), so this is consistent. If draft privacy becomes a concern, the repository can add a `createdBy` filter.
- **[Index deployment]** → New `fieldOverrides` require `firebase deploy --only firestore:indexes`. If not deployed, queries still work but may log warnings and have higher cost until the index is built.