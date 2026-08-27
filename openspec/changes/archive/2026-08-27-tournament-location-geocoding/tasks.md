## 1. Domain model (`src/domain/tournament.ts`)

- [x] 1.1 Add `tournamentLocationLocaleSchema` (`settlement?`, `venue?`) and `tournamentLocationSchema` (`latitude?` [-90..90], `longitude?` [-180..180], `country?` ISO2, `locales` ≥1 via `localeSchema`), with exported inferred types.
- [x] 1.2 Reduce `tournamentLocaleSchema` to `title` (default `''`) + optional `description`; remove `location`/`venue`; remove the `location` constraint from `publishedTournamentLocaleSchema`.
- [x] 1.3 In `tournamentSchema`: remove top-level `country`, add optional `location: tournamentLocationSchema`.
- [x] 1.4 In `publishedTournamentSchema`: require `location` with mandatory numeric `latitude`/`longitude` (strict location variant).
- [x] 1.5 Update `LocalizedTournamentData` and `getTournamentLocale` to read `settlement`/`venue`/country from `tournament.location`; fix the only consumer (`AdminDrawer`) if needed.

## 2. Geo service (`src/services/geoService.ts`, new)

- [x] 2.1 Implement `parseCoordinates(input)` (regex + range validation, decimal dot).
- [x] 2.2 Implement `reverseGeocode(lat, lon)` — Nominatim `/reverse` with `format=jsonv2&zoom=10&addressdetails=1`, sequential requests per supported locale via `accept-language`, settlement extraction from `address.city|town|village|municipality|county`, 3 s AbortController timeout.
- [x] 2.3 Implement `searchSettlement(query)` — Nominatim `/search` `format=jsonv2&limit=1` → coordinates or `null`.
- [x] 2.4 Implement `resolveLocationInput(input)` — coordinates → reverse; text → search → reverse; `null` when not found.
- [x] 2.5 Implement `resolveLocationByIp()` — move `detectLocationByIp` from `tournamentService`, keep `latitude`/`longitude` from `ipwho.is`, reverse geocode; return `null` on failure (drop the `BY` fallback).

## 3. Service + repository

- [x] 3.1 `tournamentService`: replace `country` with `location` in `CreateTournamentInput`/`UpdateTournamentInput`; persist it in `create`/`update` (`?? existing.location`); remove `detectLocationByIp` and the `location` argument of `defaultLocales`.
- [x] 3.2 `createDraft`: pre-fill `location` via `geoService.resolveLocationByIp()` (coordinates + country + localized settlements; `undefined` on failure).
- [x] 3.3 Firestore tournament repository: add legacy remap in `fromFirestore` — when no `location`, build it from `country`, `locales.<lang>.location` → `location.locales.<lang>.settlement`, `locales.<lang>.venue` → `location.locales.<lang>.venue` (no coordinates); drop the remapped legacy keys before parsing.

## 4. Form hook (`src/hooks/useTournamentForm.ts`)

- [x] 4.1 Extend `TournamentFormState` with `location` (`latitude: number|null`, `longitude: number|null`, `country: string`, `locales: Record<SupportedLocale, { settlement: string, venue: string }>`); remove `country`; add `createEmptyLocation()`; map it in `tournamentToFormState`.
- [x] 4.2 Add `updateLocation(patch)` and `updateLocationLocale(locale, field, value)` handlers; clear `validationErrors` on edit as before.
- [x] 4.3 Validation: replace `hasLocation`/`country` checks with a coordinates check producing a single `errors.location`; drop `errors.country`.
- [x] 4.4 Backfill: `buildLocalesForSave` backfills `title` only; add settlement backfill across `location.locales`; build `location` (with optional coords/country) in `formStateToUpdateInput`.
- [x] 4.5 Save-time IP fallback: in `saveDraft` and `publish` mutations, when coordinates are `null`, await `resolveLocationByIp()` and merge the resolved location into the input; publish still fails with `errors.location` when the fallback fails; draft save stays permissive.
- [x] 4.6 Auto-fill on load: after form state init, when `location.latitude == null`, resolve by IP and patch form state (draft creation included via 3.2; this covers legacy documents).

## 5. UI

- [x] 5.1 Create `src/components/tournament/TournamentLocationInput.tsx`: text input (placeholder `53.903850, 27.587277`), `BsCheckLg` confirm button, commit on button/Enter/blur, disabled + spinner while resolving, not-found state, info line (flag + localized country name + settlement in active locale / resolving hint / not-found / empty hint), `input-error` + required message wiring.
- [x] 5.2 `TournamentEditForm.tsx`: replace the Country + City grid with the single «Локация» / "Location" control; re-bind the venue `ExpandableField` to `location.locales[activeLocale].venue`; remove the `CountrySelect` import from the form.
- [x] 5.3 i18n: `tournament.edit.location` → «Локация» / "Location"; add `locationPlaceholder`, `locationNotFound`, `locationResolving`, `locationHint`; remove `tournament.edit.country`, `tournament.edit.noCountry` (both locale files).

## 6. Tests & verification

- [x] 6.1 New `src/test/geoService.test.ts`: `parseCoordinates` (valid, negative, spaces, garbage, out-of-range); `reverseGeocode`/`searchSettlement`/`resolveLocationInput` with mocked `fetch`; repository legacy remap unit coverage if feasible.
- [x] 6.2 Run `npx tsc --noEmit` and `npx vitest run` — all green.
- [x] 6.3 Manual smoke check in the dev app: create draft (IP prefill), enter coordinates, enter a settlement name, unknown text, publish validation, legacy tournament load.
