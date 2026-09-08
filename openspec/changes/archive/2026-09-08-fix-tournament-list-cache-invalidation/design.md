## Context

`restrict-tournament-edit-access` switched the drawer's tournaments month list from the `['adminTournaments', ...]` query to `['tournaments', 'editable', userId, managedAssociationIds, isAdmin]`. TanStack Query invalidation matches by key prefix, so the existing `invalidateQueries({ queryKey: ['adminTournaments'] })` calls no longer reach the new key. The drawer is permanently mounted (it slides off-screen rather than unmounting), so its query never re-mounts and stale data persists until a full page reload. `useEventForm` already invalidates the `['events']` prefix, which is why the events month list does not have this problem. `NewTournamentButton` creates drafts via `tournamentService.createDraft` without any invalidation.

## Goals / Non-Goals

- Goals: draft creation, saving, publishing, and deleting a tournament refresh the drawer's tournaments month list and search results without a page reload.
- Non-Goals: no changes to query keys or hooks' data flow; no changes to events behavior. The orphaned `['adminEvents']` invalidations (no consumers remain) are removed as part of this change.

## Decisions

### Decision 1: prefix invalidation with `['tournaments']`
Replace each `invalidateQueries({ queryKey: ['adminTournaments'] })` with `invalidateQueries({ queryKey: ['tournaments'] })`. Prefix matching updates both `['tournaments','editable',...]` (drawer month list) and `['tournaments','search',...]` (drawer search results, which also list uneditable tournaments for admins). Keeping `['adminTournaments']` alongside would be dead code — the key has no consumers anymore.

### Decision 2: invalidate right after `createDraft` in NewTournamentButton
The draft is a real tournament document the drawer lists (drafts are editable by their creator). After a successful `createDraft`, the button invalidates `['tournaments']` so the drawer list already contains the new draft when the user returns.

## Risks / Trade-offs

- Invalidating the whole `['tournaments']` prefix also refetches search results — negligible extra traffic, correct data guaranteed.

## Migration Plan

Invalidation-only fix; rollback = revert the commit.

## Open Questions

None.