## Context

Player family-name search is used in the admin drawer (`AdminDrawer.tsx`) to locate players for editing. The current path:

- `usePlayerSearch(query, locale)` debounces the query (300 ms) and calls `playerService.searchByFamilyName(prefix, locale)`.
- `FirestorePlayerRepository.searchByFamilyName` builds a single Firestore range query against `locales.${locale}.familyName` (`>= prefix`, `<= prefix + '\uf8ff'`, `orderBy`, `limit 20`).

A player document stores a `locales` record keyed by supported locale (`ru`, `en`); each value has `familyName`/`givenName`. A locale may be missing entirely for a given player (e.g., an English-only player has no `ru` block). The active UI locale is derived from `i18n.language`. Today, searching the admin panel while the UI is in Russian cannot surface players that only have an English family name, and vice versa.

Display already has a fallback: `PlayerCard` renders `player.locales[locale] ?? player.locales.ru ?? player.locales.en`, so once a player is in the result set, the current locale is shown when available and any non-empty locale otherwise. This change only needs to fix the matching side.

## Goals / Non-Goals

**Goals:**

- Match a family-name prefix against every supported locale in a single search, so players with names stored in a non-active locale are findable.
- Keep the repository/service layer locale-agnostic for search; the active locale becomes a display concern only.
- Avoid requiring new Firestore composite indexes.

**Non-Goals:**

- Cross-field search (e.g., by given name, nationality, or rating).
- Ranked/global ordering of merged results across locales.
- Server-side transliteration or case-insensitive normalization.
- Changes to the `PlayerCard` display fallback (already correct).

## Decisions

### Decision 1: Parallel per-locale range queries via `Promise.all`

Run one existing-style Firestore range query per supported locale in parallel, then merge.

- **Why over Firestore `or()`/`and()`:**
  - Each branch of a logical OR over two range predicates needs its own composite index; single-field indexes used today are insufficient.
  - Combining `or()` with range filters and `orderBy` is constrained; a unified ordering across locales is not reliably available anyway.
  - Per-locale queries reuse the exact, already-tested query shape (range + `orderBy` + `limit`).
- **Why over sequential fallback (try active locale, then others):**
  - Sequential fallback returns only the first non-empty locale's matches and hides valid matches from other locales — violates "search across all locales". Parallel merge returns the union.
- **Scaling:** Adding a future locale = adding one more promise to the `Promise.all`; no structural change.

### Decision 2: Merge and deduplicate by `player.id`

A player can match in more than one locale (e.g., both `ru` and `en` family names start with the same Latin prefix). Merge strategy:

1. Collect results from all locale queries into a single array.
2. Deduplicate by `player.id` (first occurrence wins) using a `Map` or `Set`.
3. Truncate to the existing result cap (keep the current 20-player limit on the merged set).

Order within the merged list follows the order of `supportedLocales` (`ru`, then `en`) and the per-query ordering; this is acceptable for a prefix autocomplete and is documented as a trade-off.

### Decision 3: Drop `locale` from the search API surface

Change signatures:

- `PlayerRepository.searchByFamilyName(prefix: string)` (was `(prefix, locale)`).
- `PlayerService.searchByFamilyName(prefix: string)`.
- `usePlayerSearch(query: string)` (was `(query, locale)`); remove `locale` from the TanStack Query key and query function.

Rationale:

- The active locale is no longer a search parameter; it only affects display in `PlayerCard`.
- Removing the parameter keeps the code free of unused-parameter lint errors and makes the contract explicit.
- This is a **BREAKING** internal API change but has no external consumers (single call site in `AdminDrawer`).

### Decision 4: Keep display fallback in `PlayerCard` unchanged

`PlayerCard` already implements `player.locales[locale] ?? player.locales.ru ?? player.locales.en`, satisfying "render in the current locale; if empty, render any non-empty locale." No change needed.

## Risks / Trade-offs

- **[N Firestore reads per search instead of 1]** → Acceptable for an admin-only autocomplete (N = 2 today). Parallel execution keeps latency similar; debouncing (300 ms) and `staleTime` (30 s) bound the call rate.
- **[No unified ordering across locales]** → Documented as acceptable for prefix autocomplete; results remain grouped by locale then by `familyName` within each locale. Can revisit if users request ranked ordering.
- **[Duplicated documents when a player matches in multiple locales]** → Handled by deduplication by `player.id`.
- **[Per-locale `limit` vs merged cap]** → Each locale query keeps a per-locale limit; the merged set is truncated to the overall cap. Edge case: a locale with many matches could crowd out another locale; acceptable for autocomplete, and increasing the per-locale limit later is trivial if needed.
- **[Signature break for `searchByFamilyName`]** → Only one caller (`AdminDrawer` via the hook); updated in the same change. No runtime migration required.