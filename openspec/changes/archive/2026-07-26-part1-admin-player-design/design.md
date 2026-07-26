## Context

The project follows a layered architecture with Firebase-specific repository implementations behind service classes and repository interfaces. Player management requires a full stack: domain model (exists), repository interface, Firestore repository, service, React hooks, page routing, and admin panel UI integration. The admin panel uses a DaisyUI accordion with radio inputs (`name="admin-accordion"`) to ensure only one section is open at a time.

Key constraints:
- `UserRole` is `'user' | 'admin' | 'manager'` (from `src/types/user.ts`)
- Firestore rules already restrict player create/update to admin, owner, or manager of the player's primaryAssociation
- The `Player` domain model uses `Record<string, PlayerLocale>` for `locales` (via `localeSchema`)
- Search must work per-locale on `familyName` fields stored as `locales.ru.familyName`, `locales.en.familyName` in Firestore

## Goals / Non-Goals

**Goals:**
- Add "Players" section to admin panel with role-based access control
- Create player service layer following existing repository pattern
- Implement familyName search with debounce, min 3 characters
- Add placeholder page/route for player create/edit
- Add Firestore composite indexes for search

**Non-Goals:**
- Full player edit form implementation (future task)
- Player avatar/photo upload
- Advanced search filters (rating, association, nationality)
- Bulk player import

## Decisions

### Decision 1: Repository + Service pattern (matching existing architecture)

Follow the same pattern as `firestoreTournamentRepository.ts` / `tournamentService.ts`:
- `PlayerRepository` interface in `repository.ts`
- `FirestorePlayerRepository` in `firestorePlayerRepository.ts` with `fromFirestore`/`toFirestore` using `firestoreHelpers.ts`
- `PlayerService` class in `playerService.ts`
- Export singleton `playerService`

**Alternative considered:** Direct Firestore access from hooks. Rejected because it violates the established architecture and prevents future backend swapping.

### Decision 2: Prefix search using range query on `locales.{lang}.familyName`

Firestore doesn't support `LIKE` queries, but supports range queries. For prefix search:
```ts
const q = query(
  collection(db, 'players'),
  where(`locales.${locale}.familyName`, '>=', prefix),
  where(`locales.${locale}.familyName`, '<=', prefix + '\uf8ff'),
  limit(20)
)
```

This is case-sensitive. The search will be performed on the exact case as typed. Users will learn to capitalize the first letter.

**Alternative considered:** Client-side filtering after loading all players. Rejected because it doesn't scale.

**Alternative considered:** Storing a lowercase `familyNameSearch` field for case-insensitive search. Deferred to future optimization.

### Decision 3: `usePlayerSearch` hook with debounce

A dedicated hook wrapping `useQuery` with:
- `enabled: query.length >= 3`
- `staleTime: 30_000` (30s cache)
- Debounce via `setTimeout`/`useRef` pattern (300ms)

### Decision 4: Disabled section via conditional rendering + CSS

For `user` role:
- The "Players" accordion item renders with `pointer-events-none opacity-50` classes
- The `<input type="radio">` is `disabled` to prevent opening
- A tooltip or text hint explains the restriction

**Alternative considered:** Not rendering the section at all. Rejected because it hides functionality that exists in the system.

### Decision 5: Player card in search results

Each result card shows (in order):
1. `familyName, givenName` (from active locale)
2. Country flag (`nationality` via `country-flag-icons`)
3. `location` (from active locale, if exists)
4. `currentRating.value` (if exists)
5. `currentRating.rank` (if exists)

Card styling matches tournament cards (`border rounded-lg px-3 py-2` with hover/active states).

### Decision 6: Placeholder PlayerEditForm

Minimal form showing just the player ID (or "New Player" text). Full form implementation deferred to a separate task.

## Risks / Trade-offs

- **[Risk: Case-sensitive search may confuse users]** → Mitigation: input placeholder shows "Поиск по фамилии..." / "Search by family name..." with hint to capitalize. Can add case-insensitive later with `familyNameSearch` field.
- **[Risk: No composite index needed for single-field queries]** → The `locales.ru.familyName` and `locales.en.familyName` field overrides don't need composite indexes since they're single-field range queries. Only composite indexes (with `updatedAt`) would be needed if we wanted ordered results.
- **[Risk: Race condition with rapid typing]** → Debounce (300ms) + React Query stale/cancel behavior mitigates this.