## ADDED Requirements

### Requirement: Event page routes and lookup

The application SHALL serve a public event page at `/events/{UUID}` and `/events/{slug}` as a single route whose path parameter is tested against a UUID pattern: a match SHALL load the event by id, otherwise by slug. Static event routes (`/events/new`, `/events/:id/edit`) SHALL keep priority over the public route. When the event document does not exist, the page SHALL show a localized not-found state; when loading fails, a localized load-error state; while loading, a loading spinner.

#### Scenario: Opening an event by UUID

- **WHEN** a user opens `/events/{UUID}` for an existing event
- **THEN** the event is loaded by id and the page renders

#### Scenario: Opening an event by slug

- **WHEN** a user opens `/events/{slug}` for an existing event
- **THEN** the event is loaded by slug and the page renders

#### Scenario: Unknown event

- **WHEN** a user opens `/events/{...}` with no matching event document
- **THEN** a localized not-found alert is shown

#### Scenario: Load failure

- **WHEN** the event query fails
- **THEN** a localized load-error alert is shown

### Requirement: Event page header

The event page SHALL render an `h1` with the localized event title using the fallback cascade `current locale → ru → slug`. The page SHALL set `document.title` from the `event.view.pageTitle` key with the event title, in both the tournament branch and the description branch.

#### Scenario: Localized title

- **WHEN** the event page renders for an event whose `locales` contain the current locale
- **THEN** the `h1` shows the title for the current locale

#### Scenario: Title fallback to ru and slug

- **WHEN** the event has no `locales` entry for the current locale
- **THEN** the `h1` shows the `ru` title, falling back to the event `slug`

#### Scenario: Browser tab title

- **WHEN** the event page renders
- **THEN** `document.title` equals the localized `event.view.pageTitle` with the event title

### Requirement: In-place rendering of the latest public tournament

When the event has at least one public tournament (`isPublic == true`), the page SHALL render the latest one by start time in place at the `/events/...` URL. "Latest by start time" SHALL be the maximum of the tournament start-time cascade (first round start → earliest event schedule entry → `updatedAt`), tie-broken by tournament id. The rendered view SHALL be the existing public tournament view (event `h1`, sibling tournament tabs, tournament `h2`, meta, and content tabs). While the tournament list is loading, the page SHALL show the event `h1` with a loading spinner.

#### Scenario: Single public tournament

- **WHEN** the event has exactly one public tournament
- **THEN** the tournament view renders in place at the event URL

#### Scenario: Latest by start time is chosen

- **WHEN** the event has several public tournaments with different start times
- **THEN** the tournament with the greatest start-time cascade value renders

#### Scenario: Tie-break by id

- **WHEN** two public tournaments share the same start-time cascade value
- **THEN** the one with the greater id renders

#### Scenario: Loading the tournament list

- **WHEN** the event exists and the public-tournament query is in flight
- **THEN** the event `h1` and a loading spinner are shown

### Requirement: Event description branch

When the event has no public tournaments, the page SHALL render, under the event `h1`, the event description followed by the descriptions of all regulations listed in `event.regulations` (in list order), rendered as Markdown with heading-based collapsible sections. Each text chunk SHALL use the locale fallback `current locale → ru`. When no content resolves, the section SHALL render nothing.

#### Scenario: Description and regulations order

- **WHEN** the event has a description and regulations
- **THEN** the description renders first, followed by each regulation's description in `event.regulations` order

#### Scenario: Markdown collapse rendering

- **WHEN** a rendered chunk contains Markdown headings
- **THEN** headings become nested collapsible sections and non-heading content is sanitized HTML

#### Scenario: Locale fallback per chunk

- **WHEN** a description or regulation has no text for the current locale
- **THEN** its `ru` text renders instead

#### Scenario: Event without content

- **WHEN** the event has no description and no resolvable regulation descriptions
- **THEN** only the event `h1` renders
