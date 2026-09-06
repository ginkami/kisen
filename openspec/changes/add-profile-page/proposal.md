## Why

The `/profile` route renders only a placeholder. Authenticated users need a page where they can view and edit their profile data (localized names), see account facts that cannot be edited (email, role), manage authentication (providers, password), and quickly navigate to the associations they manage.

## What Changes

- Replace the `ProfilePage` placeholder with a real edit page in the style of the existing edit pages (`RegulationEditForm`): over-title «Редактирование и управление профилем», `h1` with `{familyName} {givenName}` of the current locale (live-updated from form state while editing), header buttons «Сохранить» (disabled until there are changes) and «Удалить» (always disabled for now — delete logic is a separate task).
- Unnamed section with immutable fields: Email and Role (side by side in two columns on large screens).
- Section «Профильные данные» with a `LocaleTabs` switcher: familyName, givenName, displayName per locale (ru/en), saved via a new `userService.updateUser`; the `authUser` query cache is refreshed after saving.
- Section «Провайдеры аутентификации»: existing providers rendered as text badges (from `firebaseUser.providerData`, since the public user profile strips `auth`). Below, a password block with its own apply button:
  - password already assigned → label «Сменить пароль», fields «Старый пароль», «Новый пароль», «Повторить новый пароль», applied via reauthentication + `updatePassword`;
  - password not assigned → label «Добавить пароль», fields «Новый пароль», «Повторить новый пароль», applied via `linkWithCredential`.
  Inline validation (old required, min length 6, repeat matches) and localized Firebase error codes.
- Section «Ассоциации, которыми управляете»: badges for associations the user created (marked «(создатель)») or is a manager of, each linking to `/assn/:id/edit`.
- Auth guard: unauthenticated visitors are redirected to `/login` (same pattern as `RegulationEditForm`).
- Remove the unused `src/components/UserProfile.tsx` component.
- i18n: new `profile.edit.*` keys in `ru` and `en`; `profile.placeholder` removed.

## Capabilities

### New Capabilities

- `profile-page`: authenticated profile page at `/profile` — access guard and header with live title and save flow, immutable account fields, locale-dependent profile data editing, authentication providers display and password management, managed associations shortcuts.

### Modified Capabilities

## Impact

- Modified: `src/pages/ProfilePage.tsx`, `src/services/userService.ts` (new `updateUser`), `src/locales/ru/translation.json`, `src/locales/en/translation.json`.
- New: `src/hooks/useProfileForm.ts`, `src/components/profile/ProfileEditForm.tsx`, `src/components/profile/PasswordSection.tsx`.
- Deleted: `src/components/UserProfile.tsx` (unused legacy placeholder component).
- Tests: new `src/test/profilePage.test.tsx`.
- No Firestore rules or index changes: owner `update` on `/users/{userId}` is already permitted (with role field protection), and no new queries are introduced.
