## 1. Translations

- [x] 1.1 Add `common.fieldRequired` key to `src/locales/ru/translation.json` with value "Обязательное поле"
- [x] 1.2 Add `common.fieldRequired` key to `src/locales/en/translation.json` with value "Required field"

## 2. Player service validation

- [x] 2.1 Import `playerSchema` in `src/services/playerService.ts`
- [x] 2.2 Call `playerSchema.parse(player)` before `repository.create` in `PlayerService.create`
- [x] 2.3 Call `playerSchema.parse(player)` before `repository.update` in `PlayerService.update`

## 3. Player form hook (`usePlayerForm`)

- [x] 3.1 Fix locale filter in `formStateToCreateInput`: change OR to AND (`familyName.trim() !== '' && givenName.trim() !== ''`)
- [x] 3.2 Fix locale filter in `formStateToUpdateInput`: change OR to AND (same as above)
- [x] 3.3 Add `validationErrors` state (`Record<string, string>`) and `validatePlayerForm` function checking: at least one locale with both names filled, nationality non-empty
- [x] 3.4 Clear `validationErrors` in `updateForm` callback (set to `{}` on any field change)
- [x] 3.5 Wrap `savePlayer` to run validation; if errors, set `validationErrors` and return without calling mutation
- [x] 3.6 Call `saveMutation.reset()` before `saveMutation.mutate()` in `savePlayer`
- [x] 3.7 Switch `savePlayer` from `mutateAsync()` to `mutate()`
- [x] 3.8 Call `deleteMutation.reset()` before `deleteMutation.mutate()` in `deletePlayer`
- [x] 3.9 Switch `deletePlayer` from `mutateAsync()` to `mutate()`
- [x] 3.10 Expose `validationErrors`, `clearSaveError`, `clearDeleteError` from the hook return

## 4. Tournament form hook (`useTournamentForm`)

- [x] 4.1 Add `validationErrors` state (`Record<string, string>`) and `validateTournamentPublishForm` function checking: at least one locale with title, at least one locale with location, country non-empty, at least one locale with both arbiter names, at least one round in schedule
- [x] 4.2 Clear `validationErrors` in `updateForm` callback (set to `{}` on any field change)
- [x] 4.3 Wrap `publish` to run validation; if errors, set `validationErrors` and return without calling mutation
- [x] 4.4 Call `saveMutation.reset()` before `saveMutation.mutate()` in `saveDraft`
- [x] 4.5 Switch `saveDraft` from `mutateAsync()` to `mutate()`
- [x] 4.6 Call `publishMutation.reset()` before `publishMutation.mutate()` in `publish`
- [x] 4.7 Switch `publish` from `mutateAsync()` to `mutate()`
- [x] 4.8 Call `deleteMutation.reset()` before `deleteMutation.mutate()` in `deleteTournament`
- [x] 4.9 Switch `deleteTournament` from `mutateAsync()` to `mutate()`
- [x] 4.10 Expose `validationErrors`, `clearSaveError`, `clearPublishError`, `clearDeleteError` from the hook return

## 5. Player edit form UI

- [x] 5.1 Destructure `validationErrors`, `clearSaveError`, `clearDeleteError` from `usePlayerForm` in `PlayerEditForm.tsx`
- [x] 5.2 Pass `validationErrors` to `PlayerInfoSection` component
- [x] 5.3 Add close button to save error alert calling `clearSaveError`
- [x] 5.4 Add close button to delete error alert calling `clearDeleteError`

## 6. Player info section UI

- [x] 6.1 Add `validationErrors` prop to `PlayerInfoSection` interface
- [x] 6.2 Apply `input-error` class to familyName input when `validationErrors.familyName` is set; show error message below
- [x] 6.3 Apply `input-error` class to givenName input when `validationErrors.givenName` is set; show error message below
- [x] 6.4 Apply error styling to CountrySelect wrapper when `validationErrors.nationality` is set; show error message below

## 7. Tournament edit form UI

- [x] 7.1 Destructure `validationErrors`, `clearSaveError`, `clearPublishError`, `clearDeleteError` from `useTournamentForm` in `TournamentEditForm.tsx`
- [x] 7.2 Pass `validationErrors` to `GeneralInfoSection` component
- [x] 7.3 Add close button to save error alert calling `clearSaveError`
- [x] 7.4 Add close button to publish error alert calling `clearPublishError`
- [x] 7.5 Add close button to delete error alert calling `clearDeleteError`

## 8. Tournament general info section UI

- [x] 8.1 Add `validationErrors` prop to `GeneralInfoSection` component
- [x] 8.2 Apply `input-error` class to title input when `validationErrors.title` is set; show error message below
- [x] 8.3 Apply `input-error` class to location input when `validationErrors.location` is set; show error message below
- [x] 8.4 Apply `select-error` class to CountrySelect when `validationErrors.country` is set; show error message below
- [x] 8.5 Apply `input-error` class to arbiter givenName input when `validationErrors['arbiter.givenName']` is set; show error message below
- [x] 8.6 Apply `input-error` class to arbiter familyName input when `validationErrors['arbiter.familyName']` is set; show error message below

## 9. Verification

- [x] 9.1 Run `npm run build` to verify TypeScript compilation and Vite build pass
- [x] 9.2 Run `npm run lint` to verify ESLint passes