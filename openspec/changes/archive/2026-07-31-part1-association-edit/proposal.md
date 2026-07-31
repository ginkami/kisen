## Why

The admin drawer's "Associations" section is a placeholder. Users have no way to browse, filter, or navigate to association edit pages. This change adds the first piece of association management: a filterable list panel in the admin drawer with role-based "create" button visibility and placeholder routes for the edit page.

## What Changes

- **AdminDrawer Associations section**: replaces the placeholder with a filter input (`BsFunnel` icon), a scrollable list of associations, and a "+ Ассоциация" button (role-gated).
- **Role-based visibility**:
  - `admin` — sees all associations; create button always visible.
  - `manager` — sees created + invited associations; create button hidden if already has a created association.
  - `user` (invited manager) — sees invited associations; create button hidden.
  - `user` (not invited) — entire section disabled.
- **Filter**: text input filters the list by association title in the current locale (case-insensitive).
- **Navigation**: clicking a list item navigates to `/assn/:id/edit`.
- **Create button**: navigates to `/assn/new`.
- **Routes**: adds `/assn/new` and `/assn/:id/edit` pointing to a placeholder `AssociationEditPage`.
- **Service/Repository**: adds `listAll()` for admins to fetch all associations.
- **Hook**: adds `useAssociationsForPanel(userId, role)` that delegates to `listAll` or `listMyAssociations` based on role.

## Capabilities

### New Capabilities

- `association-management`: new capability covering association CRUD, panel, and permissions.

### Modified Capabilities

_None._

## Impact

- **Code**:
  - Modified: `src/services/firestoreAssociationRepository.ts` (`listAll`), `src/services/associationService.ts` (`listAll`), `src/hooks/useAssociations.ts` (new hook), `src/components/AdminDrawer.tsx` (associations section), `src/App.tsx` (routes).
  - New: `src/pages/AssociationEditPage.tsx` (placeholder).
- **i18n**: new keys under `admin` in `ru` and `en`.
- **Dependencies**: none.
- **Firestore rules**: no changes needed (read is already public).