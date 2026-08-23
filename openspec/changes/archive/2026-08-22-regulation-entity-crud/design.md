## Context

The project already has a layered CRUD pattern for simple localized entities: `events` (domain schema → repository interface → Firestore repository → service → form hook → edit form → admin drawer section → routes). `schemas/regulation.jsonc` (user-authored) defines the target Firestore shape for a new `regulations` collection — essentially an event minus `slug` and `startYearMonth`, but with a different access matrix: editing is allowed for the creator OR managers of the affiliated association (like events), while deleting is restricted to the creator OR an admin (unlike events, where association managers may also delete).

Existing infrastructure reused as-is: `firestoreHelpers` (`datesToTimestamps`/`timestampsToDates`), `localeSchema`, `AssociationPickerModal`, `LocaleTabs`, `ExpandableField`, `ConfirmModal`, `useOutletContext` unsaved-changes pattern, `uuidv7`.

## Goals / Non-Goals

**Goals:**

- `regulation` domain entity (Zod) mirroring `schemas/regulation.jsonc`: `id`, `createdBy`, `association: string | null`, `updatedAt: Date`, `locales` (≥1, `title` required, `description` optional Markdown).
- Firestore collection `regulations` with security rules implementing the access matrix: create = authenticated (+ manager of `association` when set); update = admin | creator | manager of affiliated association, with a host-association-change guard (manager of the NEW association); delete = admin | creator only.
- Repository + service layers: `getById`, `list` (filters `createdBy`/`association`, ordered `updatedAt` desc), `create`, `update`, `delete`, and `listEditable(userId, managedAssociationIds, isAdmin)` merging created + affiliated-with-managed (or everything for admins), deduplicated by id.
- Regulation edit page (`/regulations/new`, `/regulations/:id/edit`) with the `EventEditForm` UX minus slug; delete button visible only to creator/admin.
- Admin drawer «Регламенты»/«Regulations» section: `+ Регламент` button + scrollable full list of editable regulations (no month filter, no search), for all authenticated users.
- Firestore indexes: (createdBy ASC, updatedAt DESC) and (association ASC, updatedAt DESC).

**Non-Goals:**

- Public regulation view page / routing by slug (no slug field at all in this change).
- Referencing regulations from tournaments (tournament ↔ regulation link is a future change).
- Markdown rendering of `description` in the edit form (plain textarea via `ExpandableField`, same as event description).
- Pagination/virtualization of the drawer list (same `max-h-96 overflow-y-auto` pattern as other sections).
- Unit tests for repository/service (project has no Firestore emulator tests for the sibling event/association services; consistency kept).

## Decisions

1. **Clone the event layering, do not generalize it.** Regulation gets its own `domain/regulation.ts`, repository interface, Firestore repository, service, hook, form, and page. The project convention is explicit duplication over shared abstractions for entity CRUD (association/event already duplicate). Alternative rejected: extracting a generic `LocalizedEntityService` — larger refactor of existing entities, out of scope, harder to review.

2. **`association` semantics follow `hostAssociation` of events.** Nullable, set via `AssociationPickerModal` in a «Дополнительно» section; empty string from the form converts to `null` in the service. Security rules reuse the `isManagerOf` helper and copy the events' `isValidHostAssociationChange` guard pattern under the name `isValidAssociationChange`.

3. **Delete restricted to creator | admin.** This is the explicit user requirement and the deliberate difference from events/tournaments (where association managers may delete). The edit form hides the delete button when the current user is neither `createdBy` nor an admin (defense in depth on top of the rules; a manager of the affiliated association sees no delete UI even though they can edit).

4. **`listEditable` merges parallel queries client-side.** For a non-admin: `repository.list({ createdBy: userId })` plus `repository.list({ association: id })` per managed association (ids already available in `AdminDrawer` from `useAssociationsForPanel`), merged and deduplicated by id in a Map, then sorted by `updatedAt` desc. For an admin: a single `listAll`-equivalent (`list({})`). Alternative rejected: an `array-contains-any` query on a materialized `editors` array — denormalization + write-path complexity not justified at current scale. `in`/`array-contains-any` caps (10 clauses) would also require chunking.

5. **Drawer section without role gating.** Any authenticated user can create their own regulations, so the section is enabled for every authenticated user (no `canManage*` flag, unlike players/events/associations sections). The list itself shows what `listEditable` returns — for a regular user with no created regulations this is empty, with an empty-state hint.

6. **Public read in rules, no public UI yet.** `allow read: if true` matches events/associations and prepares for future public rendering of regulations on tournament pages. Write paths remain restricted.

7. **Form state mirrors `useEventForm` minus slug.** Same dirty tracking via JSON snapshots, same `filterLocalesForSave` (only locales with non-empty title are saved), validation = at least one localized title; query keys `['regulation', id]` / invalidations `['regulations']`; after create — `navigate(/regulations/:id/edit, { replace: true })`; delete navigates to `/`.

## Risks / Trade-offs

- [Drawer list loads ALL editable regulations regardless of month (regulations have no date semantics)] → by design; bounded by user's own + managed-association regulations; `max-h-96` scroll container, consistent with other sections.
- [N+1 queries in `listEditable` for users managing many associations] → acceptable at current scale (managers typically manage 1–2 associations); can be chunked with `in` queries later.
- [Delete rule differs from events — potential user confusion] → mitigated by hiding the delete button from non-creators in the UI.
- [Firestore rules/indexes require manual deploy] → noted in tasks; local dev works without new rules once emulated rules are updated.

## Migration Plan

None. New collection `regulations` starts empty; no existing documents or schemas change. Rollback = remove routes/UI/rules blocks; collection can stay or be dropped manually.