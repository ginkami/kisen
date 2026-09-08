## Context

Firestore rules for `events` already enforce `isAdmin || isOwner(createdBy) || canActForAssociation(hostAssociation)` (README: "Events — public read; write access for owner, host-association managers/creators, and admins"). The UI gaps are the mirror of the player work (`restrict-player-edit-access`): the drawer gates the section by role instead of access, lists only `createdBy` events per month, and both the drawer search and the tournament event picker expose events the user cannot edit. The regulations feature already solves the "created OR managed-association" listing shape with `regulationService.listEditable` (per-association queries merged client-side), and the required events composite indexes already exist.

## Goals / Non-Goals

- Goals: one shared editability rule for events; drawer section usable by every authenticated user with a truthful month list and filtered search; tournament event picker limited to editable events; URL guard on the event edit page.
- Non-Goals: no Firestore rules/index changes; no changes to event linking in tournaments beyond the picker contents; no tournament month-list fix (separate change); no changes to `/events/new`.

## Decisions

### Decision 1: `canEditEvent` helper in the event domain
Pure function mirroring the rules disjunction; `hostAssociation: null` fails the association check. Used by the drawer search filter and the edit-page guard (same shape as `canEditPlayer`).

### Decision 2: `listEditable` via per-association queries (regulations precedent)
`eventService.listEditable(userId, managedAssociationIds, isAdmin)`: admin → `list({})`; otherwise `list({ createdBy: userId })` plus one `list({ hostAssociation: id })` per managed association, merged and sorted by `updatedAt` desc. N+1 round-trips match the accepted regulations pattern; existing composite indexes cover every query. A hook `useEditableEvents(userId, managedAssociationIds, isAdmin)` wraps it (30s staleTime).

### Decision 3: month filtering client-side
Both the drawer month list and the picker load the full editable set and filter by `startYearMonth` in the client. This avoids new composite indexes (`createdBy`+`startYearMonth`, `hostAssociation`+`startYearMonth`), keeps a single cached query shared between drawer and picker, and matches the small per-user data volume. The picker keeps its month navigation UI.

### Decision 4: section gate becomes authentication-based
Creating an event sets `createdBy` to the current user and is allowed for any authenticated user by the rules — the same model as tournaments. The drawer therefore gates the section by `isAuthenticated && !!userId` instead of the admin/manager role check; the association picker inside the event form already lists only manageable associations.

### Decision 5: guard in EventEditForm, spinner-aware
Identical to the player page guard: after the event query resolves, keep the spinner while managed associations load; then render a localized `event.edit.errors.noAccess` alert instead of the form if `!canEditEvent`. Creation (`isNew`) is unaffected.

## Risks / Trade-offs

- N+1 queries per association in `listEditable` — bounded by the number of managed associations; same trade-off already accepted for regulations.
- Client-side month filtering loads all editable events regardless of month — accepted for the small per-user dataset; can move to month-scoped queries (with new indexes) if it grows.

## Migration Plan

Additive UI gating; rollback = revert the commit.

## Open Questions

None.