## Why

The association edit page is currently a placeholder. Organizers need a full edit form with localized fields (title, description, country, location, slug), save/delete operations, and a manager management section (inviting by user name or email, removing managers with role-based permissions).

## What Changes

- **AssociationService**: add `create`, `update`, `delete`, `slugExists`.
- **UserService**: add `searchByFamilyName(prefix)`, `getByEmail(email)`, `getByIds(ids)`.
- **Firestore rules**: update `create` (admin or manager), `update` (admin, creator, or managers array contains UID), `delete` (admin or creator).
- **`useAssociationForm`** hook: load, dirty-track, validate, save/delete via mutations.
- **`AssociationEditForm`** component: header block (title h1, page title, save/delete buttons with confirm), info section (LocaleTabs, title, slug, description, country, location), manager section (badges + invite input).
- **Manager invite**: dual-mode autocomplete — search by familyName (>3 chars, no `@`) or validate email (contains `@`); on select, add to managers or pendingInvites.
- **Manager removal**: role-based (admin/creator can remove; invited managers cannot).
- **Translations**: new keys under `association.edit.*` in ru and en.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `association-management`: add association edit form (title/slug/description/country/location fields), manager management (invite, remove, role-gated), and CRUD operations in service.

## Impact

- **Code**:
  - Modified: `src/services/associationService.ts` (CRUD), `src/services/userService.ts` (search/getByEmail/getByIds), `src/pages/AssociationEditPage.tsx` (replace placeholder), `firestore.rules` (permissions), `src/components/AdminDrawer.tsx` (remove manager association count limit).
  - New: `src/hooks/useAssociationForm.ts`, `src/components/association/AssociationEditForm.tsx`, `src/components/association/AssociationInfoSection.tsx`, `src/components/association/AssociationManagersSection.tsx`, `src/components/association/ManagerInviteInput.tsx`.
- **i18n**: new keys under `association.edit.*`.
- **Dependencies**: none.