## 1. Profile page

- [x] 1.1 Require `displayName` in all locales: inline error + «Сохранить» gating in `ProfileEditForm`
- [x] 1.2 Fill an empty `displayName` in other locales from the active locale on save (`useProfileForm`)
- [x] 1.3 Header `h1`/`document.title` fallback: `{familyName} {givenName}` → `displayName` → «Без имени»

## 2. Auth flows

- [x] 2.1 `splitDisplayName` helper; remove 'Placeholder' defaults in `AuthContext` (registration + Google sign-in)
- [x] 2.2 Store the real `fbUser.displayName` in every locale in `ensureUserProfile`

## 3. Password UX

- [x] 3.1 Reusable `PasswordInput` with a show/hide toggle (`auth.showPassword` / `auth.hidePassword`)
- [x] 3.2 Use `PasswordInput` in `AuthForm` and all three `PasswordSection` fields
- [x] 3.3 `PasswordSection`: success message styled as success and cleared on new input/submit

## 4. Layout

- [x] 4.1 Close `AdminDrawer` when `isAuthenticated` becomes false

## 5. i18n & Tests

- [x] 5.1 New keys in ru/en: `profile.edit.errors.displayNameRequired`, `auth.showPassword`, `auth.hidePassword`
- [x] 5.2 Update `profilePage` tests: header fallback, Save gating + auto-fill, `text-success` styling, visibility toggle (plus auth form toggle)
- [x] 5.3 Full `vitest run`, `tsc -b`, `vite build`