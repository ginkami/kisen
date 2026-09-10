# home-tournaments-board — Design

## Context

The home page is a static scaffold. Tournament documents carry `isPublic` (kept in sync with `status != 'draft' && != 'proposed_for_removing'` by the rules; `canceled` stays `isPublic: true`) and `startYearMonth` (`YYYYMM`, month granularity) but no precise top-level start timestamp: `schedule.rounds` is an array, which Firestore cannot order by. The repository's `list()` orders by `updatedAt` with no pagination. The app already has `CountrySelect` (i18n-iso-countries + country-flag-icons), `getCountryName`, `formatDayRanges`/`tournamentScheduleDays`/`formatTimeControlShort` (used by `TournamentMeta`), `useEventsByIds` for batch event titles, and `canEditTournament` + `useMyAssociations` for edit rights.

## Goals / Non-Goals

- Goals: home page listing published tournaments in three tabbed sections with counts, cursor pagination of 30, and a filter form (title, date range, country, city); tournament card matching the product spec.
- Non-Goals: OpenStreetMap integration (country list + text city suffice); server-side title/city filtering; a separate lightweight "tournament summary" collection; changing the rules.

## Decisions

### Decision 1: Page size 30
Every card renders from a full tournament document (including `participants` and `games` arrays), so read volume per page matters. 30 halves the read cost of 50 while keeping a reasonable list length. The "show more" button label reflects the page size.

### Decision 2: New `startAt` timestamp + composite indexes + one-time backfill
Sections must order by precise start time (`finished`/`ongoing` desc — recent first; `upcoming` asc — soonest first). A new top-level `startAt` (Timestamp, min of rounds/events `scheduledAt`) is written by `TournamentService.create/update` next to `startYearMonth`. Composite indexes: `(isPublic, status, startAt ASC)`, `(isPublic, status, startAt DESC)`, and both again with `location.country` inserted for the country filter. Firestore excludes documents missing the ordered field from ordered queries, so existing documents need a one-time backfill (`scripts/backfill-tournament-start-at.mjs`, client SDK with an admin sign-in from `.env.local`) — a manual deployment step. Without it, older tournaments are invisible on the home page.

### Decision 3: Cursor pagination via `useInfiniteQuery`
The repository exposes `listPublishedTournaments({ status, country, startFrom, startTo, pageSize, cursor }) → { items, nextCursor }` (`limit` + `startAfter(DocumentSnapshot)`). Each section runs its own `useInfiniteQuery`; "show more" calls `fetchNextPage` (spinner on the button). Filters that change query constraints reset the cursor.

### Decision 4: Hybrid filtering (server: country/date; client: title/city)
Country equality and the `startAt` date range ride the section composite index (range on the order field is legal). Title substring and city substring would require four more per-locale composite indexes (title) and are locale-dependent (settlement), so both are applied client-side over loaded pages: instant filtering, no index growth. Trade-off: with title/city filters active, tab counts reflect the matching loaded subset, and "show more" loads the next server-side page which is filtered locally. Documented as acceptable for v1.

### Decision 5: Tab counts via `getCountFromServer`
The count aggregation query is cheap and gives the true section size honoring the server-side filters (country/date). Client-side filters (title/city) shrink the displayed count to the matching loaded subset. Counts load independently of the lists.

### Decision 6: Card composition reuses existing view utils
`TournamentCard` renders title via `getTournamentLocale`, dates via `formatDayRanges(tournamentScheduleDays(...))` with the location timezone, time control via `formatTimeControlShort`, country name via `getCountryName` with a `country-flag-icons` flag, and batch-loaded parent event / host association titles (`useEventsByIds`; new `associationService.getByIds` following `userService.getByIds`). The edit icon renders only when `canEditTournament(tournament, uid, isAdmin, managedAssociationIds)`.

## Risks / Trade-offs

- **[Documents without `startAt` invisible until backfill]** Mitigated by the required backfill script; also `update()` writes `startAt` for any edited tournament.
- **[Client-side title/city filters only see loaded pages]** With a growing dataset the user may need to page to find a match; acceptable for v1, revisit with a dedicated search index.
- **[Count/list slight divergence]** With title/city filters, counts (server-side) vs list (server + client filters) can differ; the count then reflects the loaded matching subset.

## Migration Plan

1. Deploy indexes (`firebase deploy --only firestore:indexes`).
2. Run `scripts/backfill-tournament-start-at.mjs` once with admin credentials.
3. Deploy the app. No rules changes; `create/update` write `startAt` going forward.
