## MODIFIED Requirements

### Requirement: Event edit form

The event edit page SHALL render a form with a header block (overline "Редактирование мероприятия", h1 with localized title, document title "{title} — Редактирование мероприятия | shogi·world"), save and delete buttons. The form SHALL include a "Основная информация" section with LocaleTabs, title (required), description (ExpandableField), and a "Дополнительно" section with slug (required, prefixed with "shogi.world/events/"), and hostAssociation (AssociationPickerModal). Title and slug SHALL be validated before save. When saving, a locale with any non-empty field SHALL be kept; any empty required `title` in a kept locale SHALL be backfilled from the first locale whose `title` is non-empty, so optional description entered for a locale without a title is not lost. Delete SHALL require a confirmation modal.

#### Scenario: Saving with empty title

- **WHEN** the user clicks Save and the title is empty in all locales
- **THEN** validation blocks the save
- **AND** the title field is highlighted with an error

#### Scenario: Locale with description but no title is preserved

- **WHEN** the user fills `title` in the `ru` locale and `description` in the `en` locale, leaving `en.title` empty, and saves
- **THEN** the saved event has both locales
- **AND** the `en` locale's `title` is backfilled from the `ru` locale's `title`
- **AND** the `en` locale's `description` is preserved