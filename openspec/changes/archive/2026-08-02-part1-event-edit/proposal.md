## Why

The events section in the admin drawer is a placeholder, and there is no event edit page. Organizers need to create, edit, and delete events (мероприятия) with the same UX as tournaments but simplified — events have no draft/publish lifecycle, only title (localized), description, slug, and host association.

## What Changes

- **EventService**: add `slugExists(slug, excludeId?)` method.
- **`useEventForm`** hook: load event, dirty-track, validate (title required, slug required + unique), save/delete via mutations, slug uniqueness check.
- **`EventEditForm`** component: header block (overline "Редактирование мероприятия", h1 with localized title, document title, save/delete buttons with confirm), "Основная информация" section (LocaleTabs, title required, description via ExpandableField), "Дополнительно" section (slug required + prefixed, hostAssociation via AssociationPickerModal).
- **`EventEditPage`** page: extract `id` param, render `EventEditForm`.
- **Routes**: `events/new` and `events/:id/edit` in `App.tsx`.
- **AdminDrawer**: replace events placeholder with month selector, create button, scrollable events list (same UX as tournaments section).
- **Translations**: new keys under `event.edit.*` in ru and en.

## Capabilities

### New Capabilities

- `event-management`: event edit form, event service CRUD, events section in admin drawer.

### Modified Capabilities

_None._

## Impact

- **Code**:
  - Modified: `src/services/eventService.ts` (slugExists), `src/components/AdminDrawer.tsx` (events section), `src/App.tsx` (routes), `src/locales/ru/translation.json` + `en`.
  - New: `src/hooks/useEventForm.ts`, `src/components/event/EventEditForm.tsx`, `src/pages/EventEditPage.tsx`.
- **Dependencies**: none.