## MODIFIED Requirements

### Requirement: Content tab navigation

The page SHALL render a `tabs-box` tablist with five tabs in this order: «Описание» (`BsJournalText`), «Расписание» (`BsClock`), «Игроки» (`HiOutlineUserGroup`), «Результаты» (`Bs123`), «Таблица» (`BsGrid3X2`). Clicking a tab SHALL switch the visible content section. Only one tab's content SHALL be visible at a time. Tab labels SHALL be localized.

#### Scenario: Switching tabs

- **WHEN** the user clicks the «Расписание» tab
- **THEN** the schedule section becomes visible and the previously visible section is hidden

#### Scenario: Default tab

- **WHEN** the page loads
- **THEN** the «Описание» tab is active and its content is visible

### Requirement: Placeholder sections

The «Результаты» section SHALL render as an empty placeholder with no content in this iteration. The «Описание» section SHALL render the tournament description content defined by the «Description tab content» requirement and SHALL NOT be a placeholder anymore.

#### Scenario: Placeholder tab

- **WHEN** the user opens the «Результаты» tab
- **THEN** the section area renders empty with no controls

#### Scenario: Description tab is no longer a placeholder

- **WHEN** the user opens the «Описание» tab of a tournament that has a description
- **THEN** the section area renders the description content instead of an empty placeholder

## ADDED Requirements

### Requirement: Description tab content

The «Описание» section SHALL render Markdown content assembled from localized description sources in this exact order: the parent event's description, the tournament's description, the parent event's regulations' descriptions, the tournament's regulations' descriptions. Sources SHALL be included only when the tournament has a `parentEvent` (event description and event regulations) and only when the corresponding localized description is non-empty. When the tournament has no `parentEvent`, only the tournament's description and the tournament's regulations' descriptions SHALL be rendered. Regulations SHALL be represented solely by their Markdown description content; regulation titles SHALL NOT be rendered. A regulation attached to both the tournament and its parent event SHALL be rendered exactly once, using the tournament's copy. Localized content SHALL be picked for the current locale with a fallback to the `ru` locale. When no source yields content, the section SHALL render nothing.

#### Scenario: Tournament within an event with all sources

- **WHEN** a tournament with a `parentEvent` has a description, the event has a description, and each has one attached regulation with a description
- **THEN** the section renders, in order: the event description, the tournament description, the event regulation's description, the tournament regulation's description

#### Scenario: Standalone tournament

- **WHEN** a tournament has no `parentEvent` but has a description and one attached regulation with a description
- **THEN** the section renders only the tournament description followed by the tournament regulation's description

#### Scenario: Regulation attached to both tournament and event

- **WHEN** the same regulation id is present in both the tournament's and the parent event's regulation lists
- **THEN** the regulation's description renders exactly once, positioned among the tournament regulations

#### Scenario: Locale fallback for content

- **WHEN** the current locale is `en` and a source provides only a `ru` description
- **THEN** the `ru` description is rendered

#### Scenario: Empty sources

- **WHEN** the tournament has no description, no regulations, no `parentEvent`
- **THEN** the section area renders empty with no controls and no empty-state message

### Requirement: Description tab uses safe Markdown rendering

All content of the «Описание» section SHALL be rendered through the `markdown-rendering` capability: Markdown with raw HTML disabled and link schemes restricted to the allow-list, with headings split into collapsible sections as defined by that capability.

#### Scenario: Unsafe link in description

- **WHEN** a tournament description contains a Markdown link with a `javascript:` URL
- **THEN** the element renders without a usable link target (no `javascript:` navigation is possible)
