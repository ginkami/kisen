## 1. Preparation

- [x] 1.1 Read current `src/domain/tournament.ts`, `src/hooks/useTournamentForm.ts`, `src/components/tournament/TournamentEditForm.tsx`, `src/utils/countries.ts`, and existing admin panel event list components.
- [x] 1.2 Update `src/locales/en/translation.json` and `src/locales/ru/translation.json` with new keys for labels, placeholders, tooltips, and modal texts.

## 2. Domain and form state

- [x] 2.1 Extend `TournamentFormState` in `useTournamentForm.ts` to include `slug`, `parentEvent`, `hostAssociation`, and locale-aware `description`/`venue`/`arbiter` fields.
- [x] 2.2 Add form-state helpers that mirror `ru` values into empty `en` values (plain copy for text, transliteration for givenName/familyName).
- [x] 2.3 Ensure slug normalization is applied on input.
- [x] 2.4 Keep IP-based country/city prefill for new drafts.

## 3. Reusable UI components

- [x] 3.1 Create `CountrySelect` component with emoji flags and localized country names.
- [x] 3.2 Create `LocaleTabs` component for the ru/en language switcher inside the form.
- [x] 3.3 Create `ExpandableField` wrapper that shows a "+ Label" button when the field value is empty.
- [x] 3.4 Create `EventPickerModal` component listing events of the current month sorted by `updatedAt`, with a "Не указано" option.
- [x] 3.5 Create `AssociationPickerModal` component listing associations where the current user is creator or manager.

## 4. Service and query layer

- [x] 4.1 Add `getEventsForMonth(year, month)` repository query and corresponding TanStack Query hook.
- [x] 4.2 Add `getMyAssociations(uid)` query (merge creator + manager results) and corresponding TanStack Query hook.
- [x] 4.3 Verify no new Firestore composite indexes are required; if needed, update `firestore.indexes.json`.

## 5. Tournament edit form

- [x] 5.1 Remove the "Arbiter" tab from `TournamentEditForm`.
- [x] 5.2 Redraw the "General info" tab: locale switcher, full-width name, expandable description, half-width country/city, expandable venue, half-width arbiter givenName/familyName.
- [x] 5.3 Add the "Binding" section with slug, parentEvent picker, and hostAssociation picker (visible only for managers/admins).
- [x] 5.4 Apply required-field red asterisk and validation highlight styles.
- [x] 5.5 Reuse the user's adjusted CSS classes for section backgrounds, tab backgrounds, and the language switcher.

## 6. Validation and build

- [x] 6.1 Update form-level Zod validation to cover new fields and required slug.
- [x] 6.2 Run `npm run lint` and fix issues. (Note: 6 pre-existing lint errors remain in `Layout.tsx`, `NewTournamentButton.tsx`, `AuthContext.tsx`, and `useTournamentForm.ts`; none are introduced by this change.)
- [x] 6.3 Run `npm run build` and fix TypeScript errors.
- [x] 6.4 Run tests if available and update snapshots.

## 7. OpenSpec wrap-up

- [x] 7.1 Run `openspec status --change part1-tournament-edit-ux-general-info` to confirm all artifacts are done.
- [x] 7.2 Ask the user to review the generated planning artifacts.
