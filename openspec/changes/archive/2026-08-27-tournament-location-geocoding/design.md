## Context

The tournament location is currently modeled as a top-level `country` (ISO 3166-1 alpha-2) plus free-text `locales.<lang>.location` (city) and `locales.<lang>.venue`. The edit form uses two controls (a `CountrySelect` dropdown and a city text input), and `createDraft` pre-fills them from IP geolocation (`ipwho.is` → country + city). The JSONC schema has been reworked: all geo data now lives in a single `location` object keyed by coordinates, and the UI should center on coordinates with country/settlement derived via geocoding.

Existing pieces that constrain the design:

- `tournamentService.detectLocationByIp()` calls `ipwho.is`, which already returns `latitude`/`longitude` alongside `country_code`/`city` (currently discarded).
- `publishedTournamentSchema` derives from `tournamentSchema`; publish validation flows through `validateTournamentPublishForm` in `useTournamentForm` plus a final `publishedTournamentSchema.parse`.
- Locale backfill helper `backfillRequiredLocaleFields` (`src/utils/locales.ts`) is shared by all save paths.
- Old tournament documents in Firestore have the legacy shape; there is no backend to run a batch migration.

## Goals / Non-Goals

**Goals:**

- New `location` domain shape matching `schemas/tournament.jsonc`: coordinates-first, with `country` and localized `settlement`/`venue` inside.
- One «Локация» / "Location" control in the General info tab that accepts either `lat, lon` coordinates or a settlement name, resolves everything else via the OpenStreetMap (Nominatim) API, and shows the resolved flag/country/settlement in an info line.
- Preserve the IP-geolocation bootstrap: new drafts and legacy-schema tournaments loaded into the form get coordinates from the user's IP plus reverse geocoding.
- Lazy migration of legacy documents: remap on read, rewrite in the new shape on the next save.

**Non-Goals:**

- No map picker UI, no interactive map rendering.
- No batch/backfill migration job over existing Firestore documents.
- No offline caching of geocoding results.
- No changes to `CountrySelect` itself — it remains in use for associations, players, and tournament participants (nationality/residence).
- No Firestore rules or index changes (`location` is nested inside the tournament document; rules do not validate these fields).

## Decisions

### 1. Schema: coordinates optional in the base schema, required at publish

`tournamentLocationSchema` = `{ latitude?: number(-90..90), longitude?: number(-180..180), country?: ISO2, locales: >=1 { settlement?, venue? } }`, and `tournamentSchema.location` is **optional**. `publishedTournamentSchema` replaces it with a strict variant requiring numeric `latitude`/`longitude`.

*Rationale:* legacy documents and freshly created drafts legitimately have no coordinates (IP detection can fail). Making the field required in the base schema would break reading old data; the JSONC "Required" marking is enforced where it matters — at publication. `country`/`settlement` stay optional even for publish (reverse geocoding over ocean or an IP-detect failure must not block publishing a tournament whose coordinates are valid).

*Alternative rejected:* one-time migration script — there is no backend runtime; coordinates for old data cannot be derived from a city string without geocoding each document.

### 2. New `src/services/geoService.ts` as the single geocoding façade

- `parseCoordinates(input)` — pure: regex `-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?` + range validation.
- `reverseGeocode(lat, lon)` — Nominatim `/reverse` (`format=jsonv2&zoom=10&addressdetails=1`), **two sequential requests** with `accept-language=ru` and `accept-language=en` to build `settlements` for every supported locale; settlement extracted from `address.city|town|village|municipality|county`.
- `searchSettlement(query)` — Nominatim `/search` (`format=jsonv2&limit=1`) → coordinates or `null`.
- `resolveLocationInput(input)` — pipeline: coordinates → reverse geocode; otherwise text → search → reverse geocode; `null` when not found.
- `resolveLocationByIp()` — moves `detectLocationByIp` here, now keeping `latitude`/`longitude` from `ipwho.is`, then reverse geocoding. Returns `null` on any failure (the old `BY` fallback is dropped; the form's save-time fallback and validation handle the failure instead).

All requests use short `AbortController` timeouts (3 s) like the current helper, and per-resolution requests run sequentially to respect Nominatim's usage policy (max 1 req/s, identification via standard browser headers).

*Rationale:* a dedicated service keeps the Firebase-isolating service layer intact, is trivially mockable in tests, and lets both `tournamentService.createDraft` and `useTournamentForm` share one implementation instead of duplicating IP logic.

### 3. Legacy remap in the Firestore tournament repository, not in Zod

`fromFirestore` checks the raw document before parsing: if `location` is absent and legacy fields exist, it constructs `location` from `country`, `locales.<lang>.location` → `location.locales.<lang>.settlement`, `locales.<lang>.venue` → `location.locales.<lang>.venue` (coordinates stay absent). Saves use full-document `setDoc`, so legacy fields disappear on the next save.


### 4. Hook owns location form state and the save-time IP fallback

`TournamentFormState.location` = `{ latitude: number|null, longitude: number|null, country: string, locales: Record<SupportedLocale, { settlement: string, venue: string }> }` with `updateLocation` / `updateLocationLocale` handlers. The location *text input* state (pending text, resolving flag, not-found flag) lives inside the new `TournamentLocationInput` component and never enters the saved form state.

Validation (`validateTournamentPublishForm`): drop `hasLocation`/`country` checks; add a coordinates check → single `errors.location`. Backfill: `title` only for tournament locales; `settlement` (not required) is backfilled across `location.locales` the same way so both locales stay consistent. `saveDraft`/`publish` mutations await `resolveLocationByIp()` when coordinates are `null` and merge the result into the built input before persisting — publish still fails with `errors.location` if the fallback fails; draft save stays permissive.

Auto-fill on load: after `tournamentToFormState`, if `location.latitude == null`, the hook resolves by IP and patches form state (the form becomes dirty; the next save persists the new shape). This is the user-approved assumption that the organizer's IP location matches the tournament location.

### 5. UI: `TournamentLocationInput` component

Input (placeholder `53.903850, 27.587277`) + `BsCheckLg` button (from `react-icons/bs`, already used in the form); commit on button/Enter/blur; disabled + spinner while resolving. Info line states: resolved → flag icon (same `country-flag-icons` pattern as `CountrySelect`/`PlayerCard`) + `getCountryName(country, uiLocale)` + settlement in the active locale; not found → localized message; empty → hint. The component receives `location`, `onChange`, `validationErrors.location`, and the active locale; `TournamentEditForm` replaces the Country+City grid with it and re-binds the venue `ExpandableField` to `location.locales[activeLocale].venue`.

## Risks / Trade-offs

- [Nominatim is a free public service with rate limits and no SLA] → short timeouts, sequential requests, graceful degradation: failed geocoding never blocks saving/publishing (only the coordinates requirement does); settlement/country simply stay empty. If needed later, swap the base URL for a self-hosted/proxied instance — one constant.
- [IP-based bootstrap can guess the wrong location] → the guess is always visible and editable in the info line + input; it only auto-applies when the tournament has no coordinates at all.
- [Reverse geocoding near borders/identical names for ru/en] → settlements may differ per locale or be empty; both are optional fields, publish only requires coordinates.
- [Draft save with unresolved location persists `location` without coordinates] → acceptable: publish blocks until resolved; the form re-attempts IP fill on next load.
- [BREAKING data shape] → repository remap keeps old documents readable; every subsequent save rewrites them in the new shape. Downgrade risk (deploying old code after new saves) is accepted as MVP risk.

## Migration Plan

1. Ship schema + repository remap + service + UI together (this change).
2. Existing documents keep working (remap on read); no deploy coordination needed.
3. Documents are rewritten in the new shape lazily on their next save.
4. Rollback: revert the deploy — documents saved in the new shape would lose their location on old code (old schema ignores `location`); acceptable for MVP given the small dataset.

## Open Questions

- None blocking. (Considered and resolved: whether settlement/country should be required at publish — no; whether to keep legacy settlement text — yes, via repository remap; where the IP fallback lives — in the hook mutations.)
