## MODIFIED Requirements

### Requirement: Regulation edit page

The app SHALL provide routes `/regulations/new` and `/regulations/:id/edit` rendering a `RegulationEditForm` with the same UX as the event edit form, except there is no slug field. The form SHALL contain: a header with the management-panel overline, localized title (or «Новый регламент» / "New regulation" for a new one), document title update, and Save/Delete buttons; a «Основная информация» card with `LocaleTabs`, a required localized title input, and a Markdown-capable description via `ExpandableField`; a «Дополнительно» card with the association picker (`AssociationPickerModal`). The Delete button SHALL be visible only when the current user is the creator of the regulation or an admin; deletion SHALL require confirmation. Validation SHALL require a non-empty title in at least one locale. When saving, a locale with any non-empty field SHALL be kept (not only locales with a title); any empty required `title` in a kept locale SHALL be backfilled from the first locale (in `supportedLocales` order) whose `title` is non-empty, so optional fields (e.g. description) entered for a locale without a title are not lost. Unsaved-changes navigation protection SHALL work as on other edit pages.

#### Scenario: Title validation

- **WHEN** the user saves a regulation with empty titles in all locales
- **THEN** validation fails with a required-field error and nothing is saved

#### Scenario: Locale with description but no title is preserved

- **WHEN** the user fills `title` in the `ru` locale and `description` in the `en` locale, leaving `en.title` empty, and saves
- **THEN** the saved regulation has both the `ru` and `en` locales
- **AND** the `en` locale's `title` is backfilled from the `ru` locale's `title`
- **AND** the `en` locale's `description` is preserved