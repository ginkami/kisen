## Context

The admin drawer currently has three functional sections (Tournaments, Players, Events) and a placeholder for Associations. The association domain model, repository, and a partial service exist, but:
- The service lacks `listAll()` (needed for admins).
- There are no routes for association edit pages.
- The admin drawer Associations section is a static placeholder.

## Goals / Non-Goals

**Goals:**
- Replace the placeholder with a filterable, scrollable list of associations.
- Show the list based on the user's role and permissions.
- Add a role-gated "+ Ассоциация" create button.
- Add placeholder routes `/assn/new` and `/assn/:id/edit`.
- Add `listAll()` to repository and service.

**Non-Goals:**
- Firestore rules changes (read is already public).
- Create/update/delete operations in the service (future change).
- The actual association edit form (future change — this change only adds a placeholder page).
- Manager invite/acceptance logic in the panel.

## Decisions

### Decision 1: `listAll()` in repository and service

Add a `listAll()` method to `FirestoreAssociationRepository` that fetches the entire `associations` collection (no filters). The service proxies it. This is only called for `admin` users.

### Decision 2: `useAssociationsForPanel` hook

New hook that takes `userId` and `role`:
- `admin` → calls `associationService.listAll()`.
- `manager` or `user` (invited) → calls `associationService.listMyAssociations(userId)`.
- `user` (not invited) → returns empty array (section is disabled anyway).

The hook does NOT determine whether the user is an invited manager — that's derived from whether `listMyAssociations` returns results. A `user` with 0 results sees a disabled section.

### Decision 3: Create-button visibility logic

The "create" button is controlled by `canCreateAssociation`:
- `admin` → always `true`.
- `manager` → `true` only if `createdAssociationsCount === 0` (determined by checking if any association in the list has `createdBy === userId`).
- `user` → always `false`.

### Decision 4: Filter input with `BsFunnel` icon

A text input with a `BsFunnel` icon filters the visible list by the association's title in the current locale (case-insensitive substring match). This mirrors the tournament section's month filter visually.

### Decision 5: Routes `/assn/new` and `/assn/:id/edit`

Both point to a placeholder `AssociationEditPage` component that displays a loading/message ("Association edit form will appear here"). The real form is a separate future change.

## Risks / Trade-offs

- **[`listAll()` for admins]** — Fetches all associations; acceptable for MVP volume. Can add pagination later.
- **[No create/update/delete yet]** — The routes exist but the edit page is a placeholder. Intentional for incremental delivery.