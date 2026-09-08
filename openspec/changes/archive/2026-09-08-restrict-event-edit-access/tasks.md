## 1. Domain helper

- [x] 1.1 Add `canEditEvent(event, userId, isAdmin, managedAssociationIds)` to `src/domain/event.ts`
- [x] 1.2 Add unit tests `src/test/eventAccess.test.ts` (admin; creator; host association managed; unrelated event; `hostAssociation: null`)

## 2. Editable events listing

- [x] 2.1 Add `eventService.listEditable(userId, managedAssociationIds, isAdmin)` (regulations `listEditable` pattern: admin → all; else `createdBy` + one `hostAssociation` query per managed association; dedupe by id; sort `updatedAt` desc)
- [x] 2.2 Add `useEditableEvents(userId, managedAssociationIds, isAdmin)` hook in `src/hooks/useEvents.ts`

## 3. Admin drawer events section

- [x] 3.1 Replace the admin/manager role gate with an authentication gate (`isAuthenticated && !!userId`)
- [x] 3.2 Month list: load editable events and filter client-side by selected month (replacing `listByYearMonth(userId)`)
- [x] 3.3 Filter title search results with `canEditEvent`

## 4. Event picker and page guard

- [x] 4.1 `EventPickerModal`: load editable events (via `useMyAssociations` + `useEditableEvents`), filter client-side by selected month; admins see all; keep the "no parent event" option
- [x] 4.2 `EventEditForm`: guard — spinner while managed associations load; localized access-denied alert instead of the form when the loaded event is not editable; `/events/new` unaffected
- [x] 4.3 Add `event.edit.errors.noAccess` to `src/locales/ru/translation.json` and `src/locales/en/translation.json`

## 5. Tests

- [x] 5.1 Add `src/test/eventPickerModal.test.tsx` (mocks: `eventService`, `AuthContext`, `useAssociations`): manager sees only own/managed events of the month; admin sees all; "no parent event" option present
- [x] 5.2 Add `src/test/eventEditFormAccess.test.tsx` (mocks: `useEventForm`, `AuthContext`, `useAssociations`, `regulationService`): unauthorized user sees "no access" without Save/Delete; authorized user and admin see the form; loading associations keeps the spinner

## 6. Validation

- [x] 6.1 `npx tsc -b` passes
- [x] 6.2 `npx vitest run` all green (541 + new)
- [x] 6.3 `npx vite build` succeeds
- [x] 6.4 `openspec validate restrict-event-edit-access` passes