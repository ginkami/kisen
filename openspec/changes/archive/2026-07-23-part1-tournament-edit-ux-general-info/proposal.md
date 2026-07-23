## Why

The tournament edit form currently mixes fields across tabs without a clear information hierarchy, requires users to manage multiple arbiters in a dedicated tab, and does not help users quickly fill locale-dependent fields. We need to rework the "General info" tab so that labels sit above fields, required fields are obvious, optional empty fields are collapsed behind a "+" button, locale-dependent content is grouped under language tabs, and the chief arbiter moves into the same tab. This reduces cognitive load and matches the rest of the admin UI style.

## What Changes

- Remove the dedicated "Arbiter" tab; move the chief arbiter fields into the "General info" tab.
- Reorganize "General info" into two sections: an untitled locale-aware section and "Binding".
- Labels are placed above inputs; single fields use a two-column layout on large screens, one column on small screens.
- Required field labels show a red asterisk; invalid fields are highlighted on validation.
- Optional empty fields (description, venue) are hidden behind a "+ Label" text button until opened.
- Locale-dependent fields (`name`, `description`, `venue`, `arbiter.givenName`, `arbiter.familyName`) are grouped under a language tab switcher (ru/en).
- When typing in the `ru` locale, values are mirrored to the `en` locale if it is empty: text fields are copied as-is, `givenName`/`familyName` are transliterated from Cyrillic to Latin.
- Country is a half-width dropdown with flags; city is the other half.
- Country/city are pre-filled from IP-based geolocation when a new draft is created (fallback to `BY`/empty).
- "Binding" section contains:
  - `slug` (required).
  - `parentEvent` (optional): shows "Не указано" by default, otherwise the event title as a text button; a MagnifyingGlass icon opens a modal listing events of the current month sorted by `updatedAt` with an explicit "Не указано" option.
  - `hostAssociation` (optional): hidden for regular users, visible for managers/admins. Shows "Не указана" by default or the association title; a MagnifyingGlass icon opens a modal listing only associations where the current user is a manager or creator.
- No changes to tournament statuses, Firestore rules (reads/writes remain unchanged), or the published schema.

## Capabilities

### New Capabilities
- `tournament-edit-general-info`: UX and form-state behavior for the redesigned "General info" tab of the tournament editor, including locale tabs, expandable optional fields, transliteration, IP-based country/city defaults, and event/association selection modals.

### Modified Capabilities
- `tournament-management`: Update the tournament edit form layout and state management to match the new "General info" tab design and remove the separate arbiter tab.

## Impact

- Affected files:
  - `src/components/tournament/TournamentEditForm.tsx`
  - `src/hooks/useTournamentForm.ts`
  - `src/domain/tournament.ts` (form-level types/defaults if needed)
  - `src/services/tournamentService.ts` (IP detection already present; may add event/association queries)
  - `src/locales/en/translation.json`
  - `src/locales/ru/translation.json`
  - `src/utils/countries.ts` (country dropdown helper)
- New components likely needed: `CountrySelect`, `EventPickerModal`, `AssociationPickerModal`.
- No Firestore index changes required for the new queries if existing single-field indexes cover `createdBy`, `managers`, and `updatedAt`.

## Non-goals

- Redesigning other tabs (Schedule, Settings, Participants, etc.).
- Adding real-time collaboration or auto-save.
- Implementing machine translation; only transliteration is used for names.
- Changing tournament status transitions or publication rules.
