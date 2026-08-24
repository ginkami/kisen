## MODIFIED Requirements

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

#### Scenario: Saving with a duplicate slug

- **WHEN** the user enters a slug that already exists for another event
- **THEN** the slug field shows an error "Этот URL-идентификатор уже занят"
- **AND** the save is blocked

#### Scenario: Deleting an event

- **WHEN** the user clicks Delete and confirms
- **THEN** the event is deleted
- **AND** the user is redirected to the home page