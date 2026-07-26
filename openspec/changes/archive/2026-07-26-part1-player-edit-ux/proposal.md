## Why

The player edit form (`PlayerEditForm`) is currently a placeholder. With the player service layer and admin panel search already implemented (part1-admin-player-design), the next step is the actual edit form UI for creating and editing player profiles. The form must follow the same UX patterns as the tournament edit form (ExpandableField, LocaleTabs, CountrySelect, AssociationPickerModal) and include association management with role-based access control.

## What Changes

- Replace the placeholder `PlayerEditForm` with a full edit form including all player fields
- Create a `usePlayerForm` hook following the same patterns as `useTournamentForm` (form state, dirty tracking, save/delete mutations)
- Extract a reusable `PlayerInfoSection` component (for future use in modals)
- Add association management with badge display, primary/secondary logic, and role-based restrictions
- Add all player-related i18n keys

## Capabilities

### New Capabilities
_(none)_

### Modified Capabilities
- `player-management`: The placeholder PlayerEditForm is replaced with a full edit form with all player fields, locale support, association management, and save/delete operations

## Impact

- `src/components/player/PlayerEditForm.tsx` — full rewrite from placeholder
- `src/components/player/PlayerInfoSection.tsx` — new reusable section component
- `src/hooks/usePlayerForm.ts` — new form management hook
- `src/locales/ru/translation.json` — add `player.*` keys
- `src/locales/en/translation.json` — add `player.*` keys