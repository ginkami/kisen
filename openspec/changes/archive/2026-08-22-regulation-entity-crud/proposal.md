## Why

Tournament rules, regulations, and provisions contain many repeated text blocks (pairing rules, tie-break definitions, timing rules, conduct rules). Currently every tournament organizer re-types or copy-pastes these blocks. A dedicated `regulation` domain entity stores reusable, reusable, localized Markdown texts that can be affiliated with an association and later referenced from tournaments — removing duplication and enabling single-source updates. The JSONC schema `schemas/regulation.jsonc` already documents the intended Firestore shape.

## What Changes

- New domain entity `regulation` (Firestore collection `regulations`): `id` (UUIDv7), `createdBy` (user id), `association` (UUIDv7 | null — the association applying this regulation), `updatedAt` (Date), `locales` (≥1 locale with required `title` and optional Markdown `description`). No slug, no public page in this change.
- CRUD access rules (enforced in `firestore.rules`):
  - **Edit:** the creator (`createdBy`), a manager of the affiliated association, or an admin.
  - **Delete:** only the creator or an admin (association managers can NOT delete — a stricter rule than events/tournaments).
  - **Create:** any authenticated user; when `association` is set, the user must be a manager of that association.
  - Changing `association` to a new one requires manager rights on the new association.
- New layered implementation following the existing event pattern: `src/domain/regulation.ts` (Zod schemas), `RegulationRepository` in `src/services/repository.ts` + `firestoreRegulationRepository.ts`, `regulationService.ts` with `listEditable(userId, managedAssociationIds, isAdmin)` (created ∪ affiliated-with-managed-associations ∪ all-for-admin, deduplicated, sorted by `updatedAt` desc).
- Regulation edit page (`/regulations/new`, `/regulations/:id/edit`): `RegulationEditForm` replicating the `EventEditForm` UX (header with save/delete, localized title + Markdown description via `LocaleTabs`/`ExpandableField`, association picker via `AssociationPickerModal`) minus the slug block. The delete button is hidden unless the current user is the creator or an admin. Backed by the `useRegulationForm` hook (load, dirty tracking, validation, save/delete mutations).
- Admin drawer: new «Регламенты» / "Regulations" accordion section with only a `+ Регламент` create button and a scrollable list of regulations editable by the current user (no month filter, no search). Available to all authenticated users.
- Firestore indexes for `regulations`: (createdBy, updatedAt desc) and (association, updatedAt desc).
- i18n keys for `regulation.edit.*` and `admin.regulations`/`admin.newRegulation`/`admin.noRegulations` in ru/en.

## Capabilities

### New Capabilities

- `regulation-management`: the regulation entity — domain schema, repository/service CRUD with the creator/association-manager/admin access matrix, the regulation edit form and routes, and the admin drawer «Regulations» section.

### Modified Capabilities

- (none)

## Impact

- **New files:** `src/domain/regulation.ts`, `src/services/firestoreRegulationRepository.ts`, `src/services/regulationService.ts`, `src/hooks/useRegulationForm.ts`, `src/components/regulation/RegulationEditForm.tsx`, `src/pages/RegulationEditPage.tsx`.
- **Modified:** `src/services/repository.ts` (+`RegulationRepository`), `src/App.tsx` (routes), `src/components/AdminDrawer.tsx` (regulations section), `firestore.rules` (+`regulations` match block), `firestore.indexes.json` (+2 indexes), `src/locales/ru/translation.json` + `en`.
- **Docs:** `schemas/regulation.jsonc` already exists (user-authored); implementation mirrors it.
- **Dependencies:** none new. Deploy of rules/indexes required (`firebase deploy --only firestore:rules,indexes`).
- **Public read** is enabled for `regulations` (same as events/associations) so regulations can later be rendered on public pages; no public UI in this change.