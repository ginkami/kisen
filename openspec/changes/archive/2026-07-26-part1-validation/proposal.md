## Why

Form validation on the player and tournament edit pages is effectively broken: error alert blocks never disappear (mutations are never reset), required fields are not highlighted when invalid, and the player create form allows saving with empty required fields directly to the database. This undermines data integrity and makes the forms confusing to use. Fixing this now is critical because these are the primary data-entry surfaces of the MVP.

## What Changes

- Add client-side validation that blocks save/publish when required fields are empty, surfacing per-field error messages and red highlighting (`input-error`/`select-error` DaisyUI classes).
- Add the ability to dismiss error alert blocks via a close button and via automatic `mutation.reset()` before each new attempt.
- Add service-level Zod validation (`playerSchema.parse()`) in `PlayerService.create` and `PlayerService.update` as a safety net against invalid data entering Firestore.
- Fix the locale filter bug in `usePlayerForm` where the OR condition (`familyName !== '' || givenName !== ''`) allows a locale with only one name filled to pass through, violating the domain schema that requires both `min(1)`.
- Add the `common.fieldRequired` translation key to `ru` and `en` locales.
- Add `validationErrors` state and `validateForm` logic to `usePlayerForm` and `useTournamentForm` hooks.
- Pass `validationErrors` down to `PlayerInfoSection` and `GeneralInfoSection` components for per-field highlighting.
- Switch mutation calls from `mutateAsync()` to `mutate()` where the hook consumer does not await the result, to avoid unhandled rejections when validation prevents the call.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `player-management`: Player save now validates required fields (at least one locale with both familyName and givenName, nationality required) before calling the service, highlights invalid fields, and clears errors on dismissal. `PlayerService` validates via `playerSchema.parse()` before persistence.
- `tournament-edit-form-ux`: Tournament publish now validates required fields (title, location, country, arbiter names, at least one round) before calling the service, highlights invalid fields, and clears errors on dismissal. Save draft remains permissive but errors are clearable.
- `tournament-edit-general-info`: General info section highlights invalid required fields (title, location, country, arbiter given/family name) when validation errors are present.

## Impact

**Affected code:**
- `src/hooks/usePlayerForm.ts` — add `validationErrors`, `validatePlayerForm`, `clearSaveError`, `clearDeleteError`, fix locale filter (OR→AND for completeness).
- `src/hooks/useTournamentForm.ts` — add `validationErrors`, `validateTournamentPublishForm`, `clearSaveError`, `clearPublishError`, `clearDeleteError`.
- `src/components/player/PlayerEditForm.tsx` — pass `validationErrors` to section, add close buttons to error alerts.
- `src/components/player/PlayerInfoSection.tsx` — accept `validationErrors`, apply `input-error`/`select-error` classes and field-required messages.
- `src/components/tournament/TournamentEditForm.tsx` — pass `validationErrors` to `GeneralInfoSection`, apply error classes, add close buttons to error alerts.
- `src/services/playerService.ts` — call `playerSchema.parse()` in `create` and `update`.
- `src/locales/ru/translation.json` — add `common.fieldRequired`.
- `src/locales/en/translation.json` — add `common.fieldRequired`.

**APIs/dependencies:** No new external dependencies. Uses existing Zod schemas and DaisyUI utility classes.

**Systems:** Firestore data integrity is improved by the service-level validation safety net.