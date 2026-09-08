## Context

The Firestore rules for `tournaments` already enforce `isAdmin || isOwner(createdBy) || canActForAssociation(hostAssociation)` (host-association changes additionally require rights on the new association). The UI gaps mirror the ones fixed for events (`restrict-event-edit-access`) and players (`restrict-player-edit-access`), with one extra twist: `TournamentEditForm` is the only edit form without the `isAuthenticated → /login` redirect, and the sign-out action (UserMenu) performs no navigation, so the tournament edit page stays interactive after logout. The required composite indexes (`createdBy`+`updatedAt`, `hostAssociation`+`updatedAt`) already exist, so `listEditable` needs no index work.

## Goals / Non-Goals

- Goals: one shared editability rule for tournaments; truthful drawer month list and filtered search; authentication and access guards on the tournament edit page; logout returns the user to the home page.
- Non-Goals: no Firestore rules/index changes; no changes to `canEditBinding` visibility; no changes to the public tournament page (`/tournaments/:slug`); no changes to the draft-creation flow (`/tournaments/new`, `tournament === null` until first save).

## Decisions

### Decision 1: `canEditTournament` helper in the tournament domain
Pure function mirroring the rules disjunction; `hostAssociation: null` fails the association check. Used by the drawer search filter and the edit-page guard — the same shape as `canEditPlayer`/`canEditEvent`.

### Decision 2: `listEditable` via per-association queries (regulations/events precedent)
`tournamentService.listEditable(userId, managedAssociationIds, isAdmin)`: admin → `list({})`; otherwise `list({ createdBy: userId })` plus one `list({ hostAssociation: id })` per managed association, merged, deduplicated by id, sorted by `updatedAt` desc. Wrapped by `useEditableTournaments(userId, managedAssociationIds, isAdmin)` (30s staleTime).

### Decision 3: month filtering client-side in the drawer
The month list loads the full editable set and filters by `startYearMonth` in the client (same as events) — no new composite indexes (`createdBy`+`startYearMonth`, `hostAssociation`+`startYearMonth`) are required. The existing sort by latest first-round time keeps working on the filtered list.

### Decision 4: guards in TournamentEditForm, spinner-aware
Two early returns after the load/error handling: unauthenticated → `<Navigate to="/login" replace />` (aligning with every other edit form); for a loaded tournament that the user may not edit (per `canEditTournament`, verdict deferred while `useMyAssociations` is loading) → localized `tournament.edit.errors.noAccess` alert. `tournament === null` (creation) is never denied.

### Decision 5: logout navigates home in UserMenu
The sign-out button awaits `logout()` and then navigates to `/`. This complements the existing "drawer closes on logout" behavior; edit pages additionally redirect unauthenticated visitors to `/login`, so no stale editor can remain.

## Risks / Trade-offs

- N+1 queries per managed association in `listEditable` — bounded, same trade-off accepted for regulations and events.
- Client-side month filtering loads all editable tournaments — accepted for the per-user dataset size; month-scoped queries would need new indexes.

## Migration Plan

Additive UI gating plus a logout navigation tweak; rollback = revert the commit.

## Open Questions

None.