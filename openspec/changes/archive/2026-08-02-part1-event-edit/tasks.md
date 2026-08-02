## 1. Service layer

- [x] 1.1 In `src/services/eventService.ts`, add `slugExists(slug, excludeId?)` method.
- [x] 1.2 In `src/services/firestoreEventRepository.ts`, update `slugExists` to return `string | null` (found doc id) instead of `boolean`.
- [x] 1.3 In `src/services/repository.ts`, update `EventRepository.slugExists` return type to `Promise<string | null>`.
- [x] 1.4 In `src/services/eventService.ts`, add `listMyEvents(userId)` method (merge created + managed via associations).

## 2. Hook

- [x] 2.1 Create `src/hooks/useEventForm.ts`: load via `useQuery`, form state, dirty tracking, `useMutation` for save/delete, validation, debounced slug uniqueness check.

## 3. Form components

- [x] 3.1 Create `src/components/event/EventEditForm.tsx`: header block (h1, document title, save/delete buttons + confirm), "Основная информация" section (LocaleTabs, title required, description ExpandableField), "Дополнительно" section (slug prefixed, hostAssociation via AssociationPickerModal).

## 4. Page wiring

- [x] 4.1 Create `src/pages/EventEditPage.tsx` (extract `id` param, pass to `useEventForm`, force remount with `key`).
- [x] 4.2 In `src/App.tsx`, add routes `events/new` and `events/:id/edit`.

## 5. Admin drawer

- [x] 5.1 In `src/components/AdminDrawer.tsx`, replace events placeholder with month selector, create button, events list (same UX as tournaments section).

## 6. Translations

- [x] 6.1 Add keys under `event.edit.*` in `src/locales/ru/translation.json` and `src/locales/en/translation.json` (managementPanel, newTitle, pageTitle, info, title, description, binding, slug, slugTaken, hostAssociation, noHostAssociation, save, delete, deleteConfirmTitle, deleteConfirm, errors.*).
- [x] 6.2 Add `admin.newEvent` key in both locales.

## 7. Verification

- [x] 7.1 Run `npx tsc -b --noEmit` and resolve any type errors.
