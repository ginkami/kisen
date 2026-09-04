## Why

Public URLs exist for tournaments (`/tournaments/{slug|UUID}`), but events — the grouping entity that hosts tournaments — have no public page: opening `/events/{...}` renders nothing. Users need a shareable address for an event that either shows the latest tournament of that event or, when the event has no published tournaments yet, the event description and its regulations.

## What Changes

- New public page `EventPage` served at `/events/{UUID}` and `/events/{slug}` (one route, UUID-sniffing of the `:slug` param — the pattern already used by `TournamentPage`).
- Page header: `h1` with the localized event title (`locale → ru → slug` fallback) and `document.title` from a new `event.view.pageTitle` i18n key.
- States mirror the tournament page: loading spinner, load-error alert, localized not-found. No `isPublic` gate — events are created only by admins/managers and are publicly readable in Firestore.
- If the event has public tournaments: the latest one by start time (max of the `tournamentStart` cascade, tie-break by `id`) is rendered **in place** at the `/events/...` URL by reusing `TournamentPage` through a new optional `tournamentId` prop (query by id; behavior of `/tournaments/...` routes is unchanged).
- If the event has no public tournaments: the page shows the event description followed by the descriptions of all its regulations, rendered as Markdown with heading-based collapse blocks (reuse of `MarkdownCollapsibleSections`), with the `locale → ru` fallback per text chunk; renders nothing when there is no content.
- i18n: new `event.view.*` keys (`pageTitle`, `notFound`, `errors.load`) in `ru` and `en`.

## Capabilities

### New Capabilities

- `event-public-page`: public event page at `/events/{UUID|slug}` — routing/param sniffing, header and page states, in-place rendering of the latest public tournament, and the description branch (event description + regulations) when there are no public tournaments.

### Modified Capabilities

## Impact

- `src/App.tsx`: new route `events/:slug`.
- `src/pages/EventPage.tsx` (new): data resolution and branching.
- `src/pages/TournamentPage.tsx`: minimal refactor — optional `tournamentId` prop to query a tournament by id (no behavior change for existing routes).
- `src/components/event/EventDescriptionSection.tsx` (new): event description + regulations Markdown.
- `src/utils/tournamentDisplay.ts`: new pure helper `latestTournament(list)` (+ unit tests).
- `src/locales/{ru,en}/translation.json`: new `event.view.*` keys.
- Tests: new `src/test/eventPage.test.tsx`, extensions in `tournamentDisplay` tests. No service, repository, Firestore rules, or index changes.
