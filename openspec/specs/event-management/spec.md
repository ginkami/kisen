## Purpose

Event entities and their management: the admin drawer "Events" section with independent month selection and title search, event edit routes and form including regulation references, and service-level `startYearMonth` synchronization and slug uniqueness checks.

## Requirements

### Requirement: Events section in admin drawer

The admin drawer's "Events" section SHALL render an independent month selector (with `BsCalendar2` icon), a "+ Мероприятие" create button, and a scrollable list of events available to the user for the selected month. The month selector SHALL be independent from the tournaments section month selector. The section SHALL be available to every authenticated user: any user may create events (owner-based, like tournaments), and the month list SHALL show the events the user may edit — events they created plus events under associations they manage (all events for admins) — filtered client-side to the selected month. Event title search results SHALL be filtered to the events the user may edit; when nothing editable matches, the existing "no search results" message SHALL be shown.

#### Scenario: Admin views events for a month

- **WHEN** a user with role `admin` opens the Events section and selects a month
- **THEN** all events for that month are listed
- **AND** the "+ Мероприятие" button is visible

#### Scenario: Manager views created and managed events

- **WHEN** a user with role `manager` opens the Events section and selects a month
- **THEN** events they created plus events under associations they manage are listed
- **AND** the "+ Мероприятие" button is visible

#### Scenario: Regular user views own events

- **WHEN** a user with role `user` opens the Events section and selects a month
- **THEN** events they created for that month are listed
- **AND** the "+ Мероприятие" button is visible so they can create new events

#### Scenario: Selecting a different month

- **WHEN** the user changes the month selector
- **THEN** the list updates to show events for the newly selected month

#### Scenario: Month selector filters events

- **WHEN** the user changes the month selector in the Events section
- **THEN** only events with matching `startYearMonth` are displayed

#### Scenario: Search results filtered to editable events

- **WHEN** the user searches by title and a matching event has no relation to them
- **THEN** that event is not displayed in the search results
- **WHEN** every matching event is unrelated to the user
- **THEN** the "no search results" message is displayed

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

The event edit page SHALL render a form with a header block (overline "Редактирование мероприятия", h1 with localized title, document title "{title} — Редактирование мероприятия | shogi·world"), save and delete buttons. The form SHALL include a "Основная информация" section with LocaleTabs, title (required), description (ExpandableField), and a "Дополнительно" section with slug (required, prefixed with "shogi.world/events/"), and hostAssociation (AssociationPickerModal). Title and slug SHALL be validated before save. When saving, a locale with any non-empty field SHALL be kept; any empty required `title` in a kept locale SHALL be backfilled from the first locale whose `title` is non-empty, so optional description entered for a locale without a title is not lost. Below the description `ExpandableField`, the form SHALL provide a regulations picker: a «+ Регламент» button visually styled like `ExpandableField`; when the event has selected regulations, a «Регламенты» label with removable outline badges per regulation (localized title + × button) appears above the button; clicking the button opens a `RegulationPickerModal` listing only unselected, user-editable regulations; picking a regulation closes the modal and adds its badge. The event entity SHALL hold a `regulations` array of regulation id references (UUIDv7, default empty): old event documents without the field parse with an empty array. Delete SHALL require a confirmation modal.

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

#### Scenario: Locale with description but no title is preserved

- **WHEN** the user fills `title` in the `ru` locale and `description` in the `en` locale, leaving `en.title` empty, and saves
- **THEN** the saved event has both locales
- **AND** the `en` locale's `title` is backfilled from the `ru` locale's `title`
- **AND** the `en` locale's `description` is preserved

#### Scenario: Saving with a duplicate slug

- **WHEN** the user enters a slug that already exists for another event
- **THEN** the slug field shows an error "Этот URL-идентификатор уже занят"
- **AND** the save is blocked

#### Scenario: Deleting an event

- **WHEN** the user clicks Delete and confirms
- **THEN** the event is deleted
- **AND** the user is redirected to the home page

#### Scenario: No regulations selected

- **WHEN** the event has no regulations and the user opens the event edit form
- **THEN** only the «+ Регламент» button is rendered below the description field

#### Scenario: Selected regulations render as removable badges

- **WHEN** the event has two selected regulations
- **THEN** the «Регламенты» label renders with two outline badges showing localized titles, each with a working × removal button, above the «+ Регламент» button

#### Scenario: Picker lists only unselected editable regulations

- **WHEN** the user opens the picker and one of their editable regulations is already selected
- **THEN** the modal list excludes that regulation and shows the remaining editable ones

#### Scenario: Adding a regulation from the picker

- **WHEN** the user picks a regulation in the modal
- **THEN** the modal closes and a badge for the picked regulation appears next to the existing badges

#### Scenario: Existing event without the regulations field

- **WHEN** an event document created before this change (no `regulations` field) is loaded
- **THEN** it parses with `regulations` equal to an empty array

#### Scenario: Saving selected regulations

- **WHEN** the user adds regulations in the edit form and saves
- **THEN** the persisted event contains the selected regulation ids in `regulations` in selection order

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

### Requirement: Event title search in admin drawer

The `EventRepository` SHALL provide a `searchByTitle(prefix: string): Promise<Event[]>` method that performs server-side prefix matching on `locales.<locale>.title` across all supported locales. The `EventService` SHALL expose this method as a passthrough. The admin drawer's "Events" section SHALL provide a search input field above the month datepicker. When the search field contains 3 or more characters, the datepicker SHALL be disabled, and matching event cards (from the entire collection, not limited by month) SHALL be displayed. Search SHALL be debounced (300ms). The search SHALL cover all supported locales.

#### Scenario: User searches for an event by title

- **WHEN** the user types 3 or more characters in the event search field
- **THEN** the month datepicker becomes disabled
- **AND** the system performs a server-side search across all locales after a 300ms debounce
- **AND** matching event cards from any month are displayed

#### Scenario: User clears the event search field

- **WHEN** the event search field contains fewer than 3 characters
- **THEN** the month datepicker becomes active again
- **AND** the events for the selected month are displayed as before

#### Scenario: Search covers all locales

- **WHEN** an event has a title in `en` locale that matches the search prefix but the `ru` locale title does not
- **THEN** the event is included in the search results

#### Scenario: Search with no results

- **WHEN** the user types a prefix that matches no event title in any locale
- **THEN** a "no events found" message is displayed
- **AND** the datepicker remains disabled

#### Scenario: Repository searchByTitle implementation

- **WHEN** `searchByTitle` is called with a prefix
- **THEN** the repository issues Firestore range queries (`>=` prefix, `<=` prefix + `\uf8ff`) on `locales.<locale>.title` for each supported locale in parallel
- **AND** results are deduplicated by document id
- **AND** the result set is limited to 20 items