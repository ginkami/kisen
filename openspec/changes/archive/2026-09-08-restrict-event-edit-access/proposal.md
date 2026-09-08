## Why

Firestore rules already restrict event writes to admins, the event's creator, and managers of the event's `hostAssociation` — but the UI contradicts this model in four places: the drawer "Events" section is role-gated away from regular users (who may legitimately create their own events), the month list hides association events from their managers, the event title search lets any user navigate to events they cannot edit, and the tournament `parentEvent` picker offers every public event while saving a tournament bound to an event the user does not manage is a dead end.

## What Changes

- Add a pure helper `canEditEvent(event, userId, isAdmin, managedAssociationIds)` in the event domain mirroring the Firestore event rules (`isAdmin || createdBy === userId || hostAssociation is managed`).
- Add `eventService.listEditable(userId, managedAssociationIds, isAdmin)` (regulations `listEditable` pattern) and a `useEditableEvents` hook.
- Admin drawer "Events" section: available to all authenticated users (creation is owner-based, like tournaments); month list shows editable events for the selected month; search results filtered to editable events.
- Tournament `EventPickerModal`: offers only events the current user may edit (all for admins), month-filtered client-side.
- Guard `/events/:id/edit`: localized access-denied state instead of the form when the loaded event is not editable (spinner while managed associations load, like the player edit page).
- New locale key `event.edit.errors.noAccess` (ru/en).

## Capabilities

### New Capabilities

- `event-edit-access`: client-side gating of event edit access — the shared editability rule, drawer section availability and search filtering, event picker restriction, and the direct-URL guard on the event edit page.

### Modified Capabilities

- `event-management`: the "Events section in admin drawer" requirement is re-gated (all authenticated users), lists editable events per month (creator or managed `hostAssociation`), and search results are filtered to editable events.

## Impact

- `src/domain/event.ts` (helper), `src/services/eventService.ts` (`listEditable`), `src/hooks/useEvents.ts` (hook), `src/components/AdminDrawer.tsx`, `src/components/tournament/EventPickerModal.tsx`, `src/components/event/EventEditForm.tsx`, `src/locales/ru/translation.json` + `en`.
- No Firestore rules or index changes — existing composite indexes (`createdBy`+`updatedAt`, `hostAssociation`+`updatedAt`) cover the new queries.
- Known related gap, out of scope: the tournaments month list in the drawer appears to filter by `createdBy` only (same shape); separate change if confirmed.