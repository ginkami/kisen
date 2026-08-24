## Why

`CountrySelect` renders a DaisyUI dropdown with the full localized country list (~250 entries). Finding a country requires scrolling a long list, which is tedious in the tournament country field, the player nationality/residence fields, and the participant nationality/residence fields that all reuse the component. A text filter makes selection fast.

## What Changes

- `CountrySelect` gains a search input at the top of the dropdown list: a sticky header row inside `dropdown-content` with a `input input-sm input-bordered` field (placeholder «Поиск...» / "Search...").
- Filtering is case-insensitive, applied to the localized country name OR the ISO 3166-1 alpha-2 code (typing "ru" or "us" matches Russia/USA by code), computed via `useMemo` from the existing `getCountryList(lang)` result.
- When the dropdown opens, the search query resets to empty and the input auto-focuses.
- The placeholder ("— not selected —") clear-item is shown only when the search query is empty; while filtering, only matching countries are listed.
- An empty-state hint («Ничего не найдено» / "No results found") is shown when the filter matches no country.
- Two new i18n keys in the existing `common` block: `search`, `noResults` (ru/en).
- No API/props changes: all existing call sites (tournament `country`, player `nationality`/`residence`, participant `nationality`/`residence`) get the search behavior automatically.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `tournament-edit-general-info`: the country dropdown requirement is extended with the search/filter behavior (search input, name-or-code filtering, empty state, query reset on open).

## Impact

- **Modified:** `src/components/tournament/CountrySelect.tsx` (+search state, +filter memo, +sticky input row, +empty state), `src/locales/ru/translation.json` + `en` (+2 keys in `common`).
- **Dependencies:** none new.
- **Call sites unchanged:** `TournamentEditForm`, `PlayerInfoSection` (×2), `ParticipantRow` (×2) inherit the feature with no code changes.