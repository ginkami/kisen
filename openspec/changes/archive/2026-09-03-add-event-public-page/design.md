## Context

Tournaments already have a public page at `/tournaments/{slug|UUID}` (`src/pages/TournamentPage.tsx`): one route, UUID-regex sniffing of the `:slug` param, `isPublic` gate, and a layout that — when the tournament has a `parentEvent` — already renders `h1` = event title, `EventTournamentTabs` over sibling tournaments, `h2` = tournament title, meta, tab bar, and content sections. Events themselves (`src/domain/event.ts`) have `id` (UUID), `slug` (`[a-z0-9-]+`), localized `locales` (`title`, optional `description`), and a `regulations: string[]` list of regulation ids. `eventService` already exposes `getById` / `getBySlug`; `tournamentService.list({ parentEvent, isPublic: true })` already exists and is used by the tournament page. The start-time cascade `tournamentStart(t)` (first round → earliest event schedule entry → `updatedAt`) and `sortTournamentsByStart` already live in `src/utils/tournamentDisplay.ts`. Markdown rendering with heading-based collapse blocks is provided by `MarkdownCollapsibleSections` (built on sanitized `MarkdownContent`).

## Goals / Non-Goals

**Goals:**

- A shareable public address for every event: `/events/{UUID}` and `/events/{slug}`.
- With public tournaments: open the latest one (by start time) in place, reusing the existing tournament view.
- Without public tournaments: show the event description and its regulations as collapsible Markdown.
- Zero behavior change for existing `/tournaments/...` routes.

**Non-Goals:**

- No event `isPublic` field or event-level publish workflow (events are admin/manager-created and publicly readable in Firestore rules).
- No changes to services, repositories, Firestore rules, or indexes.
- No event listing/sitemap pages; the event page is reachable by direct URL (and existing admin links).

## Decisions

### 1. One route, param sniffing — no router changes

`<Route path="events/:slug">` in `src/App.tsx` matches both `{UUID}` and `{slug}`; `EventPage` tests the param against the same UUID regex as `TournamentPage`: match → `eventService.getById(param)`, otherwise → `eventService.getBySlug(param)`.

*Rationale:* mirrors the established tournament-page pattern; static routes `events/new` and `events/:id/edit` rank above the dynamic segment in React Router, so admin routes are unaffected.

### 2. Render-in-place by reusing `TournamentPage`, not duplicating the view

When public tournaments exist, `EventPage` picks the latest one and renders `<TournamentPage tournamentId={latest.id} />`. `TournamentPage` gets an optional `tournamentId?: string` prop: when present it queries `getById(tournamentId)` with query key `['tournament', 'view', 'id', tournamentId]` instead of sniffing `useParams`.

*Rationale:* for a tournament with `parentEvent` the existing page already renders exactly the desired layout (event `h1`, sibling tabs, tournament `h2`, tabs, sections). Duplication would copy ~60 lines of tab/section wiring. Alternatives considered: (a) redirect to `/tournaments/{slug}` — rejected by product decision (URL must stay on the event); (b) extract a shared `TournamentPublicView` presentational component — larger refactor for no behavior gain now.

### 3. Latest tournament = max `tournamentStart`, public only

New pure helper `latestTournament(list)` in `src/utils/tournamentDisplay.ts`: returns the tournament with the greatest `tournamentStart(t)` value, tie-broken by `id` (same tie-break direction as `sortTournamentsByStart`). Input is `tournamentService.list({ parentEvent, isPublic: true })` — drafts never satisfy the "has tournaments" branch.

*Rationale:* reuses the existing cascade (first round → earliest event schedule entry → `updatedAt`) so the definition of "start time" is consistent everywhere; pure function → trivial unit tests.

### 4. Description branch: dedicated `EventDescriptionSection`

New `src/components/event/EventDescriptionSection.tsx`: builds one Markdown string from the event description followed by the descriptions of **all** regulations in `event.regulations`, and renders `<MarkdownCollapsibleSections markdown={...} />`. Per-chunk locale fallback `locale → ru`; regulations fetched with `regulationService.getById` via `useQueries` (same pattern as `TournamentDescriptionSection`); renders `null` when nothing resolved.

*Rationale:* `TournamentDescriptionSection` hard-codes tournament semantics (it also renders tournament copies of regulations and a tournament-part preamble); parameterizing it with flags would complicate a tested component. A ~30-line section reusing `regulationService` + `MarkdownCollapsibleSections` inherits all established requirements (sanitization, heading-based nesting, preamble as plain text, empty → nothing) without touching existing tests.

### 5. No `isPublic` gate on the event itself

`Event` has no `isPublic` field and Firestore rules already allow public reads of events. The page gates only on document existence: not-found alert otherwise.

### 6. `document.title` owned by `EventPage`

`EventPage` sets `document.title` from `event.view.pageTitle` with the event title. Effects run child-first, so the parent's assignment deterministically wins over the title set by the embedded `TournamentPage` — the event URL always advertises the event title in both branches.

## Risks / Trade-offs

- [Tournament switch via `EventTournamentTabs` leaves the event URL] → Accepted for MVP; consistent with existing tabs behavior. A future change can scope tab navigation to the event URL.
- [Two-step load (event → tournaments → tournament) shows sequential spinners] → Mitigated by rendering the event `h1` + spinner while tournaments load; data is cached by TanStack Query so revisits are instant.
- [`latestTournament` depends on `tournamentStart` cascade correctness] → Cascade is already covered by existing `tournamentDisplay` tests; new helper gets its own tie-break tests.

