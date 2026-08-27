## Why

The tournament location is currently stored as a manually entered free-text city string plus a separate ISO country code (two controls in the edit form). This is error-prone, produces non-localized settlement names, and stores no coordinates — making the location unusable for maps and future geo-queries. The JSONC schema has already been reworked around coordinates, and the codebase needs to follow.

## What Changes

- **BREAKING (data model)**: `tournament.country`, `tournament.locales.<lang>.location`, and `tournament.locales.<lang>.venue` are replaced by a single `tournament.location` object — `{ latitude, longitude, country?, locales: { <lang>: { settlement?, venue? } } }` — matching the updated `schemas/tournament.jsonc`.
- New geocoding service (`src/services/geoService.ts`) built on the OpenStreetMap Nominatim API: coordinate parsing, reverse geocoding (coordinates → country code + settlement names per locale via `accept-language`), and settlement search by free text; plus IP-based location resolution (moved from `tournamentService.detectLocationByIp`, now also returning coordinates).
- The General info tab replaces the "Country" dropdown + "City / region" input with a single required «Локация» / "Location" control: one text input accepting either coordinates (`53.903850, 27.587277`) or a settlement name, with a `BsCheckLg` confirm button; input is committed on button click, Enter, and blur. An info line below the input shows the country flag, the country name in the current UI locale, and the localized settlement; failed lookups show a "not found" message there.
- New drafts pre-fill `location` from the user's IP geolocation (coordinates resolved, then reverse geocoded) — the existing approach, extended. Tournaments loaded from the database with the legacy schema get their coordinates resolved the same way; legacy `country`/`locales.*.location`/`locales.*.venue` values are carried over into `location` by a repository-level remap and rewritten in the new shape on the next save.
- Publish validation now requires valid coordinates (`location.latitude`/`location.longitude`) instead of non-empty location text + country. On save with missing/unconfirmed coordinates, the system first retries IP-based resolution; if that fails, the field is flagged as required (publish is blocked; draft save remains permissive).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `tournament-management`: «Tournament basic information» — the entity shape changes to the `location` object (country code and localized settlement/venue move inside it); draft prefill and publish validation scenarios updated. «Removed features» — the "country selection is always visible" scenario is replaced by the location input behavior.
- `tournament-edit-general-info`: «General info layout» — a single Location control replaces Country + City side-by-side fields; «Country and city defaults» — IP detection now resolves coordinates and reverse-geocodes them into the whole `location` object; REMOVE «Country dropdown with flags» for the tournament form (the shared `CountrySelect` component remains in use for associations, players, and participants); ADDED «Location input with geocoding» covering commit triggers, geocoding flows, the info line, and the IP fallback; «General info field error highlighting» — the `country` error key is removed, `location` now targets the single location input.
- `tournament-edit-form-ux`: «Tournament publish field validation» — publish requires resolved coordinates instead of non-empty `location` text and `country`; locale backfill now applies to `title` (tournament locales) and `settlement` (location locales).

## Impact

- Domain: `src/domain/tournament.ts` — new `tournamentLocationSchema` (+ locale variant), `tournamentLocaleSchema` reduced to `title`/`description`, `publishedTournamentSchema` requires full `location` with coordinates, `getTournamentLocale` reads settlement/venue from `tournament.location`.
- Services: new `src/services/geoService.ts` (Nominatim reverse/search + ipwho.is IP resolution); `src/services/tournamentService.ts` — `Create`/`UpdateTournamentInput` carry `location` instead of `country`, `createDraft` prefill via geo service, `detectLocationByIp` removed; Firestore tournament repository gains a legacy-document remap on read.
- Hook/UI: `src/hooks/useTournamentForm.ts` (location form state, `updateLocation`/`updateLocationLocale` handlers, publish validation, IP fallback in save/publish mutations, auto-fill for legacy tournaments); new `src/components/tournament/TournamentLocationInput.tsx`; `TournamentEditForm.tsx` General info section rework.
- i18n: `tournament.edit.location` repurposed («Локация» / "Location"), new `locationPlaceholder`/`locationNotFound`/`locationResolving`/`locationHint` keys; `tournament.edit.country` and `tournament.edit.noCountry` removed.
- External APIs: `nominatim.openstreetmap.org` (reverse + search, sequential requests, short timeouts) and `ipwho.is` (existing).
- Tests: new `src/test/geoService.test.ts` (coordinate parsing, mocked Nominatim/ipwho.is flows, repository legacy remap); existing suites unaffected.
- No Firestore rules or index changes: `location` is nested inside the tournament document and the rules do not validate these fields.
