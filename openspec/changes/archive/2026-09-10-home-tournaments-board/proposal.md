## Why

The home page is still the initial scaffold (static text and demo buttons). Per the product concept, it should render the list of public tournaments — the primary content of the site — with sectioning by tournament phase, pagination, and filtering.

## What Changes

- New home page layout: `h1` «Турниры», a fixed left filter form (desktop; collapsible on small screens), and a daisyUI `tabs-border` panel with three tabs — «Завершенные», «Проходящие», «Предстоящие» — each with its count in the tab label.
- Each section lists published tournaments (`isPublic && status ∈ {finished, ongoing, upcoming}`) in pages of 30, cursor-paginated («Показать следующие 30 турниров» text button with spinner per section).
- Ordering by a new top-level `startAt` timestamp (min of rounds/events scheduledAt, maintained by the service alongside `startYearMonth`): finished/ongoing — recent first (desc); upcoming — soonest first (asc). New composite Firestore indexes + a one-time backfill script for existing documents.
- Filter form: title search (client-side substring), date range (server-side range on `startAt`), country (server-side equality, reusing `CountrySelect`), city (client-side substring across locale settlements). «Применить» applies; «Отмена» clears and resets.
- New `TournamentCard`: h2 title link to the tournament page, parent event subtitle link, edit icon (`BsPencilSquare`) for users who may edit, one meta row (dates, time control, participants, rounds) plus association badge and country flag/name/settlement.
- No OpenStreetMap usage: `CountrySelect` (i18n-iso-countries) already covers the country list; city is a plain text filter.

## Capabilities

### New Capabilities

- `home-tournaments`: the home page public tournaments board — tabs with counts, ordering and cursor pagination, the filter form, and the tournament card composition.

## Impact

- `src/domain/tournament.ts` (optional `startAt`), `src/services/firestoreTournamentRepository.ts` + `src/services/repository.ts` + `src/services/tournamentService.ts` (`startAt` maintenance, `listPublishedTournaments`), `src/services/associationService.ts` (`getByIds`), `firestore.indexes.json` (+4 composite indexes), `scripts/backfill-tournament-start-at.mjs` (new one-off), `src/hooks/usePublicTournaments.ts` (new), `src/components/home/*` (new), `src/pages/HomePage.tsx`, `src/locales/ru/translation.json` + `en`.
- Manual steps: `firebase deploy --only firestore:indexes`; run the backfill script once (documents without `startAt` are excluded from the ordered queries).
- Out of scope: OpenStreetMap integration, server-side title/city filtering, a separate summary collection for lighter reads.
