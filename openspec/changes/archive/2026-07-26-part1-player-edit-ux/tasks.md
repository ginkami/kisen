## 1. i18n — Player form translation keys

- [x] 1.1 Add `player.*` keys to `src/locales/ru/translation.json`
- [x] 1.2 Add matching `player.*` keys to `src/locales/en/translation.json`

## 2. Form hook — usePlayerForm

- [x] 2.1 Define `PlayerFormState` interface in `src/hooks/usePlayerForm.ts`
- [x] 2.2 Implement `playerToFormState(player: Player)` conversion (rating value → string, birthDate → ISO string)
- [x] 2.3 Implement `formStateToCreateInput(state, userId)` and `formStateToUpdateInput(player, state)` conversions
- [x] 2.4 Implement `usePlayerForm(playerId)` hook: `useQuery` for loading, `useState` for form state + snapshot, `isDirty` via JSON comparison
- [x] 2.5 Add `saveMutation` (create or update) and `deleteMutation` with `useMutation`
- [x] 2.6 Implement handlers: `updateLocale`, `updateBasic`, `updateRating`, `addAssociation`, `removeAssociation`
- [x] 2.7 Add `setHasUnsavedChanges(isDirty)` via outlet context
- [x] 2.8 Handle `playerId === 'new'` — initialize empty form state when `firebaseUser` is available

## 3. PlayerInfoSection — reusable section component

- [x] 3.1 Create `src/components/player/PlayerInfoSection.tsx` with card layout, locale switcher header
- [x] 3.2 Render required fields: familyName*, givenName*, CountrySelect* (nationality), location*
- [x] 3.3 Render optional fields with ExpandableField: residence (CountrySelect), club (text input)
- [x] 3.4 Implement grouped rating ExpandableField (ratingValue number input + rank select + title text input) with single `+ Рейтинг` button when all three empty
- [x] 3.5 Render optional fields: gender (ExpandableField with select men/women), birthDate (ExpandableField with date input)
- [x] 3.6 Implement association block: badges for primary + secondary associations, AssociationPickerModal button
- [x] 3.7 Implement association badge removal with primary/secondary logic (primary removable only by creator)
- [x] 3.8 Disable association block for `user` role (read-only badges, no add/remove)

## 4. PlayerEditForm — full page form

- [x] 4.1 Rewrite `src/components/player/PlayerEditForm.tsx` with header block: technical subheading, h1 with player name (or "Новый игрок"), Save/Delete buttons
- [x] 4.2 Implement `document.title` reactivity: `{familyName}, {givenName} — Редактирование | shogi·world`
- [x] 4.3 Integrate `usePlayerForm` hook and render `PlayerInfoSection` with all props wired
- [x] 4.4 Implement Save button: calls `saveDraft`, shows spinner during save
- [x] 4.5 Implement Delete button with `ConfirmModal` (hidden for new players)
- [x] 4.6 Show save/delete error alerts (matching tournament form pattern)
- [x] 4.7 Show loading spinner while player data is loading (except for 'new')

## 5. Verification

- [x] 5.1 Run `npm run lint` — no new errors (pre-existing set-state-in-effect warnings only)
- [x] 5.2 Run `npm run test:run` — 39/39 tests pass (App.test.tsx failure is pre-existing)
- [x] 5.3 Manual smoke test: create new player, fill fields, save, edit, verify page title updates, test associations, verify role-based restrictions
