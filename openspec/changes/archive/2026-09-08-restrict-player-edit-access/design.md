## Context

Firestore rules for `players` updates already enforce: `isAdmin() || isOwner(resource.data.createdBy) || hasPlayerManagerAccess(resource) (manager of primaryAssociation) || canActForAssociation(primaryAssociation) || hasSecondaryAssociationAccess(resource)`. The UI currently lets any manager search every player in the admin drawer and open `/players/:id/edit` directly; such attempts end in a failed save. The fix is client-side only — the UI must mirror the rules, not replace them.

Key facts:
- `playerService.searchByFamilyName` and `playerService.getById` return full `Player` documents (`createdBy`, `primaryAssociation`, `secondaryAssociations`), so editability can be evaluated entirely on the client.
- `useAssociationsForPanel(userId, role)` (admin drawer) returns all associations for admins and the user's created/managed associations (`listMyAssociations`) otherwise; `useMyAssociations(userId)` provides the same list for the edit page.
- `PlayerSearchPanel` is used only by `AdminDrawer`; it owns its own search query.

## Goals / Non-Goals

- Goals: never offer an uneditable player in the drawer search; block direct-URL access with a clear localized message; one shared source of truth for the editability rule.
- Non-Goals: no changes to Firestore rules/indexes; no server-side filtering of search; no gating of the tournament participant `PlayerEditModal` (separate change); no restriction of `/players/new` (creation rules are untouched and `createdBy` makes the creator eligible).

## Decisions

### Decision 1: single pure helper in the domain layer
`canEditPlayer(player, userId, isAdmin, managedAssociationIds)` in `src/domain/player.ts` (pure, no React imports) implements the rule and is used by both the drawer filter and the page guard. Mirrors the rules' disjunction exactly; `null` primary association simply fails the association checks.

### Decision 2: optional `filter` prop on PlayerSearchPanel
The panel stays generic: `filter?: (player: Player) => boolean` applied to search results before rendering. `AdminDrawer` computes the filter via `useMemo` (undefined for admins / missing user, so admins keep today's behavior). The existing `admin.noPlayersFound` message covers the "everything filtered out" case.

### Decision 3: guard inside PlayerEditForm, spinner-aware
`PlayerEditForm` already renders early returns for auth/loading/loadError. After the player query resolves, add: if the user's managed-associations query is still loading → keep the spinner (never show a false "no access"); once resolved, if `player` exists and `!canEditPlayer(...)` → render an `alert` with `player.edit.errors.noAccess` instead of the form. Creation (`playerId === 'new'` → `player === null`) is unaffected.

### Decision 4: locale key under player.edit.errors
`player.edit.errors.noAccess` ("У вас нет прав на редактирование этого игрока." / "You do not have permission to edit this player.") — consistent with the existing `load`/`save`/`delete` error keys.

## Risks / Trade-offs

- Filtering happens client-side after a capped (20 results) search: a manager may see fewer results than exist. Accepted — Firestore rules would reject any other use anyway.
- `listMyAssociations` powers the verdict; if a user was just added as a manager, a stale 30s cache could briefly show "no access". Same staleness window the drawer already has; mitigated by keeping the spinner during initial load.

## Migration Plan

Purely additive UI gating, no data or API changes. Rollback = revert the commit.

## Open Questions

None.