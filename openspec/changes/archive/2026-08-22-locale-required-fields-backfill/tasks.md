## 1. Shared helper

- [x] 1.1 Create `src/utils/locales.ts` with `localeHasAnyContent<T extends Record<string, string | undefined>>(fields: T): boolean` (any value non-empty after trim) and `backfillRequiredLocaleFields<L extends Record<string, Record<string, string | undefined>>>(locales: L, requiredFields: string[]): L` — for each locale entry, for each required field empty after trim, take the first non-empty value of that field across locales in `supportedLocales` order; return a new object (immutability for dirty-snapshot stability)
- [x] 1.2 Create `src/test/locales.test.ts`: backfill copies from the first locale with the field; whitespace-only treated as empty; mixed sources per field; no source → field stays empty; `localeHasAnyContent` true/false matrix

## 2. Regulation / Event / Association

- [x] 2.1 `src/hooks/useRegulationForm.ts` `filterLocalesForSave`: keep locales where `localeHasAnyContent` is true (was: `title !== ''`); backfill `['title']` for kept locales; map as before. Validation stays (`hasTitle` on original values)
- [x] 2.2 `src/hooks/useEventForm.ts` `filterLocalesForSave`: same change as regulation (required: `title`)
- [x] 2.3 `src/hooks/useAssociationForm.ts` `filterLocalesForSave`: same change (required: `title`; optional description/location preserved)

## 3. Player

- [x] 3.1 `src/hooks/playerFormHelpers.ts` `formStateToCreateInput` and `formStateToUpdateInput`: keep locales where `localeHasAnyContent` is true (was: both `familyName` and `givenName` non-empty); backfill `['familyName', 'givenName']`; preserve optional location/club/title

## 4. Tournament

- [x] 4.1 `src/hooks/useTournamentForm.ts`: add `buildLocalesForSave(locales)` = `backfillRequiredLocaleFields(locales, ['title', 'location'])` (keeps both locales; tournament schema allows empties, so no drop). Use it in `formStateToUpdateInput` (`locales: buildLocalesForSave(state.locales) as Tournament['locales']`) and in the `publishMutation` candidate (`locales: buildLocalesForSave(formState.locales)`)
- [x] 4.2 Add `buildArbiterForSave(arbiter)` = `backfillRequiredLocaleFields(arbiter, ['givenName', 'familyName'])`; use it in `formStateToUpdateInput` arbiter block and in `publishMutation` candidate arbiter block
- [x] 4.3 `rowsToParticipants`: change locale filter from OR (`familyName || givenName`) to `localeHasAnyContent`; backfill `['familyName', 'givenName']` for kept locales before serializing

## 5. Verification

- [x] 5.1 Run `npx tsc --noEmit` — no type errors
- [x] 5.2 Run `npx vitest run src/test/locales.test.ts src/test/crosstableModel.test.ts src/test/pairingsModel.test.ts` — all green
- [x] 5.3 Manual check: regulation with en description + empty en title saves (title backfilled, description preserved); tournament with only ru locale publishes without Zod error; participant with en location but no en names saves and shows backfilled names after reload

## 6. Docs

- [x] 6.1 Mark tasks complete and archive the change via /opsx:archive after user acceptance