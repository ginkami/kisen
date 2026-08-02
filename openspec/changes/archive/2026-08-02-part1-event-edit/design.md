## Context

The event domain model (`eventSchema`) supports `slug`, `locales` (title/description), `hostAssociation`, `createdBy`, `updatedAt`, and `startYearMonth`. The repository and service have basic CRUD, but there are no form components, no routes, and the admin drawer's events section is a placeholder. Events differ from tournaments: no draft/publish lifecycle, no settings, no schedule, no participants.

## Goals / Non-Goals

**Goals:**
- Event edit form with localized title (required), description (ExpandableField), slug (required, unique, prefixed), host association (AssociationPickerModal).
- Save (create or update) and delete with confirmation.
- Admin drawer events section with month selector, create button, scrollable list.
- Routes `events/new` and `events/:id/edit`.

**Non-Goals:**
- Public event pages (slug-based read-only views) — future work.
- Changing the event schema or domain model.

## Decisions

### Decision 1: EventService.slugExists

Add `slugExists(slug: string, excludeId?: string): Promise<boolean>` — queries `repository.slugExists(slug)` and checks against `excludeId`. Same pattern as `associationService.slugExists`.

### Decision 2: `useEventForm` hook

Follows `useAssociationForm` pattern (simpler than `useTournamentForm`):
- `useQuery` for loading existing event.
- `useState` for `EventFormState` (slug, locales, hostAssociation).
- `useMutation` for save (create or update) and delete.
- Dirty tracking via `JSON.stringify` snapshot.
- `validationErrors` for title (required) and slug (required, unique).
- Debounced slug uniqueness check (same pattern as association/tournament).
- `setHasUnsavedChanges` via outlet context.

### Decision 3: `EventEditForm` component

Structure (simplified version of `AssociationEditForm`):
- **Header block**: overline "Редактирование мероприятия", h1 with localized title, document title `"{title} — Редактирование мероприятия | shogi·world"`, save + delete buttons (with `ConfirmModal`).
- **"Основная информация" section**: `LocaleTabs`, title (required), description (`ExpandableField`).
- **"Дополнительно" section**: slug (required, prefixed `shogi.world/events/`), hostAssociation (`AssociationPickerModal`).

For new events (`/events/new`), the form initializes with empty state and `hostAssociation` defaults to `null`. The create flow generates a `uuidv7` id and a slug from user input or auto-generated.

### Decision 4: AdminDrawer events section

Replace placeholder with the same UX as tournaments section:
- Month selector (`<input type="month">` with `BsCalendar2` icon).
- Create button (`+ Мероприятие`, navigates to `/events/new`).
- Scrollable list of events for the selected month.
- Uses `useEventsForMonth` hook (already exists) but needs to filter by user access (events the user created or manages via association).

### Decision 5: Event list in admin drawer

The `EventService.listByYearMonth` already supports `createdBy` filter. For manager access (events under associations the user manages), we need a `listMyEvents` method that queries both `createdBy` and `hostAssociation` (via associations the user manages). This follows the `listMyAssociations` pattern.

## Risks / Trade-offs

- **[Event list access filtering]** — `listByYearMonth` filters by `createdBy` only. Managers need to see events under their associations. Add a `listMyEvents(userId)` that merges created + managed events.