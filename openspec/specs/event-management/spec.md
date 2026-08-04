## ADDED Requirements

### Requirement: Events section in admin drawer

The admin drawer's "Events" section SHALL render an independent month selector (with `BsCalendar2` icon), a role-gated "+ Мероприятие" create button, and a scrollable list of events available to the user for the selected month. The month selector SHALL be independent from the tournaments section month selector. The section SHALL be available to users with role `admin` or `manager`, and to invited managers who have events under their associations.

#### Scenario: Admin views events for a month

- **WHEN** a user with role `admin` opens the Events section and selects a month
- **THEN** all events for that month are listed
- **AND** the "+ Мероприятие" button is visible

#### Scenario: Manager views created and managed events

- **WHEN** a user with role `manager` opens the Events section and selects a month
- **THEN** events they created plus events under associations they manage are listed
- **AND** the "+ Мероприятие" button is visible

#### Scenario: Selecting a different month

- **WHEN** the user changes the month selector
- **THEN** the list updates to show events for the newly selected month

#### Scenario: Month selector filters events

- **WHEN** the user changes the month selector in the Events section
- **THEN** only events with matching `startYearMonth` are displayed

#### Scenario: Navigating to event edit page

- **WHEN** the user clicks an event in the list
- **THEN** the application navigates to `/events/:id/edit`

#### Scenario: Creating a new event

- **WHEN** the user clicks the "+ Мероприятие" button
- **THEN** the application navigates to `/events/new`

### Requirement: Event edit routes

The application SHALL register routes `/events/new` and `/events/:id/edit` that render an `EventEditPage` component.

#### Scenario: Visiting the new event route

- **WHEN** the user navigates to `/events/new`
- **THEN** the event edit form with empty fields is rendered

#### Scenario: Visiting the edit event route

- **WHEN** the user navigates to `/events/:id/edit`
- **THEN** the event edit form loads the event data

### Requirement: Event edit form

The event edit page SHALL render a form with a header block (overline "Редактирование мероприятия", h1 with localized title, document title "{title} — Редактирование мероприятия | shogi·world"), save and delete buttons. The form SHALL include a "Основная информация" section with LocaleTabs, title (required), description (ExpandableField), and a "Дополнительно" section with slug (required, prefixed with "shogi.world/events/"), and hostAssociation (AssociationPickerModal). Title and slug SHALL be validated before save. Delete SHALL require a confirmation modal.

#### Scenario: Editing an existing event

- **WHEN** the user navigates to `/events/:id/edit`
- **THEN** the form loads the event data
- **AND** the h1 displays the localized title
- **AND** the document title is set to "{title} — Редактирование мероприятия | shogi·world"

#### Scenario: Creating a new event

- **WHEN** the user navigates to `/events/new`
- **THEN** the form displays empty fields
- **AND** the h1 displays "Новое мероприятие"

#### Scenario: Title and document title update reactively

- **WHEN** the user changes the title field
- **THEN** the h1 heading updates immediately
- **AND** the document title updates immediately

#### Scenario: Saving with empty title

- **WHEN** the user clicks Save and the title is empty in all locales
- **THEN** validation blocks the save
- **AND** the title field is highlighted with an error

#### Scenario: Saving with a duplicate slug

- **WHEN** the user enters a slug that already exists for another event
- **THEN** the slug field shows an error "Этот URL-идентификатор уже занят"
- **AND** the save is blocked

#### Scenario: Deleting an event

- **WHEN** the user clicks Delete and confirms
- **THEN** the event is deleted
- **AND** the user is redirected to the home page

### Requirement: Event startYearMonth synchronization

The `EventService` SHALL provide a `syncStartYearMonth(eventId)` method that recalculates the event's `startYearMonth` as the minimum `startYearMonth` across all tournaments with `parentEvent` equal to the given event id. If no tournaments are linked, it SHALL default to the current month.

#### Scenario: startYearMonth synced when tournament is linked

- **WHEN** a tournament's `parentEvent` is set to this event's id
- **THEN** the event's `startYearMonth` is recalculated as the minimum `startYearMonth` across all linked tournaments
- **AND** the event is updated in the repository

#### Scenario: startYearMonth recalculated when tournament is unlinked

- **WHEN** a tournament's `parentEvent` is changed away from this event's id
- **THEN** the event's `startYearMonth` is recalculated from remaining linked tournaments
- **AND** if no tournaments remain linked, `startYearMonth` defaults to the current month

### Requirement: Event service slugExists method

The `EventService` SHALL expose a `slugExists(slug: string, excludeId?: string): Promise<boolean>` method that checks whether any event uses the given slug, excluding the event with the provided id.

#### Scenario: Checking slug uniqueness

- **WHEN** `slugExists` is called with a slug
- **THEN** it returns `true` if another event already uses that slug