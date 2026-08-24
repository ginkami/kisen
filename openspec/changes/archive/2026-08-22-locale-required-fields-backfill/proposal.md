## Why

When editing localized entities, the form filters locales by a required field (e.g. `title`) before saving. If the user fills an optional field (e.g. `description`) for a locale but leaves the required field empty for that same locale, the **entire locale is dropped** on save — the optional content is silently lost. For tournaments the situation differs: locales are saved wholesale, but `publishedTournamentSchema` requires every present locale to have non-empty `title` and `location` (and arbiter `familyName`/`givenName`), so publishing a tournament with only one locale filled throws a Zod parse error. The user is asked to retype or copy values across locales manually, which is needless busywork.

## What Changes

- New shared helper `src/utils/locales.ts` with two pure functions: `localeHasAnyContent(fields)` (any field non-empty after trim) and `backfillRequiredLocaleFields(locales, requiredFields)` (for each kept locale, empty required fields take the first non-empty value of that field across locales in `supportedLocales` order).
- **Regulation / Event / Association** (`filterLocalesForSave`): keep a locale when it has any non-empty field (was: required field non-empty); then backfill the required `title` from other locales. Validation "at least one locale with a title" stays — if no locale provides a title at all, the existing error is shown.
- **Player** (`formStateToCreateInput`/`formStateToUpdateInput` in `playerFormHelpers.ts`): keep a locale when any field is non-empty (was: both `familyName` and `givenName` non-empty); backfill `familyName` and `givenName`.
- **Tournament** (`useTournamentForm`): a `buildLocalesForSave` helper applies backfill of `title` + `location` to all locales (tournaments persist both locales always; this guarantees `publishedTournamentSchema` validity on publish); a `buildArbiterForSave` helper backfills `givenName`/`familyName`; both are used in `formStateToUpdateInput` and in the `publishMutation` candidate. `rowsToParticipants` switches from OR-keep to keep-if-any-content + backfill of `familyName`/`givenName` for participant locales.
- No UI changes: backfill happens in the save path; after save the hooks refresh form state from the saved entity, so the copied values appear in the form.
- No Firestore rules/index changes; no schema changes (existing schemas already accept the resulting locale shapes).

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `regulation-management`: the regulation edit form saves a locale that has any content (not only ones with a title) and backfills empty required `title` from other locales.
- `event-management`: same locale backfill behavior for the event edit form (required `title`).
- `tournament-management`: the tournament save/publish path backfills empty `title`/`location` (tournament locales) and `givenName`/`familyName` (arbiter locales) from other locales; participant locales with any content are kept and backfilled.
- `tournament-edit-form-ux` (association/player validation forms): association edit form and player edit form apply the same any-content-keep + backfill behavior for their required locale fields (`title` for associations; `familyName`/`givenName` for players).

## Impact

- **New:** `src/utils/locales.ts`, `src/test/locales.test.ts`.
- **Modified:** `src/hooks/useRegulationForm.ts`, `src/hooks/useEventForm.ts`, `src/hooks/useAssociationForm.ts`, `src/hooks/playerFormHelpers.ts`, `src/hooks/useTournamentForm.ts`.
- **Dependencies:** none new.
- **Behavioral note:** for tournaments, draft saves now persist backfilled `title`/`location`/arbiter names in the secondary locale (previously empty); this is harmless and keeps publish valid. For the other entities, previously-dropped locales are now saved with the required field copied from another locale.