## Why

After implementing part 2 of the tournament-edit UX improvements, two inconsistencies remain: the header language switcher still shows a non-localized `RU` label, and the chief arbiter is modeled and rendered as an optional field. The product rules require every tournament to have a chief arbiter, and the arbiter's names should default to the authenticated user's profile to reduce friction and ensure data completeness.

## What Changes

- Localize the header `LanguageSwitcher` labels: `RU` → `РУ`, keeping `EN` for English.
- Make `arbiter` a required field in the tournament domain schema (`tournamentSchema`, `publishedTournamentSchema`).
- Remove the collapsible `ExpandableField` behavior for the arbiter section in `TournamentEditForm`; render given/family name inputs as mandatory fields with required indicators.
- Ensure every new tournament draft is created with an `arbiter` object prefilled from the current user's profile (`givenName` + `familyName` for both `ru` and `en` locales), with a fallback if the full profile has not loaded yet.
- Update `tournamentService.create` and `createDraft` inputs so that `arbiter` is required.
- Adjust form-state mapping and validation so that empty arbiter names are rejected.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `tournament-edit-form-ux`: General-info form requirements are updated to treat arbiter as mandatory and to localize the header language switcher consistently.

## Impact

- `src/components/LanguageSwitcher.tsx`
- `src/domain/tournament.ts` (Zod schemas)
- `src/services/tournamentService.ts`
- `src/services/firestoreTournamentRepository.ts` (parsing defaults for legacy drafts)
- `src/hooks/useTournamentForm.ts`
- `src/components/tournament/TournamentEditForm.tsx`
- `src/locales/en/translation.json` / `src/locales/ru/translation.json` (if new labels are needed)
