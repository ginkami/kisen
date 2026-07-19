## 1. Dependencies and Cleanup

- [x] 1.1 Install `country-flag-icons` and update `package.json` / lockfile.
- [x] 1.2 Verify whether `src/utils/transliterate.ts` is used anywhere else; if not, delete it.

## 2. Remove Locale Mirroring

- [x] 2.1 In `useTournamentForm.ts`, remove the `ru → en` copy logic from `updateLocale`.
- [x] 2.2 In `useTournamentForm.ts`, remove the transliteration and `ru → en` copy logic from `updateArbiter`.
- [x] 2.3 Remove the `transliterateCyrillicToLatin` import from `useTournamentForm.ts`.

## 3. Refactor Expandable Optional Fields

- [x] 3.1 Update `ExpandableField` to render a `+ <Label>` button (with `PlusIcon`) when the field is empty.
- [x] 3.2 Update `ExpandableField` to render its own label above the input when the field is expanded or already has a value.
- [x] 3.3 Add optional `children` and `isEmpty` props to `ExpandableField` so composite fields like arbiter can use the same show/hide behavior.
- [x] 3.4 In `TournamentEditForm`, remove the outer `<label>` elements for description, venue, and arbiter.
- [x] 3.5 Wrap the description and venue inputs in `ExpandableField` with the appropriate labels.
- [x] 3.6 Wrap the arbiter name inputs in `ExpandableField` and pass `isEmpty` based on both given and family names.

## 4. Localize Locale Switcher Labels

- [x] 4.1 In `LocaleTabs`, change the Russian locale label from `RU` to `РУ` and keep `EN` for English.

## 5. Replace Country Selector Flags

- [x] 5.1 In `CountrySelect`, replace the native `<select>` with a DaisyUI dropdown (trigger button + scrollable list).
- [x] 5.2 Import flag components from `country-flag-icons/react/3x2` and render the SVG flag next to each country name in the list and in the selected trigger.
- [x] 5.3 Ensure the dropdown closes when a country is selected.

## 6. Prefill Arbiter on Draft Creation

- [x] 6.1 Add an optional `arbiter` field to `CreateDraftInput` in the tournament service/repository layer.
- [x] 6.2 Update `tournamentService.createDraft` and the Firestore repository to persist the provided arbiter in the draft document.
- [x] 6.3 In `useTournamentForm`, wait for the `user` profile to load (`user !== undefined`) before creating the draft.
- [x] 6.4 Pass the current user's `givenName` and `familyName` from both `user.locales.ru` and `user.locales.en` into `createDraft`.

## 7. Verification

- [x] 7.1 Run `npm run lint` and fix any errors.
- [x] 7.2 Run `npm run build` and confirm it succeeds.
- [x] 7.3 Run `npm test -- --run` and confirm all tests pass.
