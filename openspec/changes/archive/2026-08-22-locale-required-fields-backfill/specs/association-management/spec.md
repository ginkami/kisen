## MODIFIED Requirements

### Requirement: Association edit form

The association edit page SHALL render a form with a header block (overline "Редактирование ассоциации", h1 with localized title, document title "{title} — Редактирование ассоциации | shogi·world"), save and delete buttons with confirmation. The form SHALL include an "Информация об ассоциации" section with LocaleTabs, title (required), description (ExpandableField), country, and location, and a manager management section. Title SHALL be validated before save. When saving, a locale with any non-empty field SHALL be kept; any empty required `title` in a kept locale SHALL be backfilled from the first locale whose `title` is non-empty, so optional fields (description, location) entered for a locale without a title are not lost.

#### Scenario: Locale with description but no title is preserved

- **WHEN** the user fills `title` in the `ru` locale and `description` in the `en` locale, leaving `en.title` empty, and saves
- **THEN** the saved association has both locales
- **AND** the `en` locale's `title` is backfilled from the `ru` locale's `title`
- **AND** the `en` locale's `description` is preserved