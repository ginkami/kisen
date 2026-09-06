## MODIFIED Requirements

### Requirement: Profile page access and header

The application SHALL serve an authenticated profile page at `/profile` that redirects unauthenticated visitors to `/login` and shows a loading spinner while the auth state resolves. The page header SHALL show an over-title «Редактирование и управление профилем», an `h1` with `{familyName} {givenName}` of the current locale rendered from the form state (updating live while the user edits these fields), falling back to the active locale's `displayName` and then to the localized «Без имени» when both name parts are empty (the same fallback applies to the browser tab title), a «Сохранить» button disabled until the form has changes AND the active locale's `displayName` is non-empty, and a «Удалить» button that stays disabled until deletion logic is implemented.

#### Scenario: Unauthenticated visitor

- **WHEN** an unauthenticated user opens `/profile`
- **THEN** they are redirected to `/login`

#### Scenario: Live header title

- **WHEN** the user edits familyName or givenName for the current locale
- **THEN** the `h1` updates immediately to `{familyName} {givenName}` of the edited values

#### Scenario: Header falls back to the display name

- **WHEN** `familyName` and `givenName` of the active locale are empty but `displayName` is not
- **THEN** the `h1` and the browser tab title show the active locale's `displayName`

#### Scenario: Save gating

- **WHEN** the profile form has no changes or the active locale's `displayName` is empty
- **THEN** the «Сохранить» button is disabled; it becomes enabled after the first edit with a non-empty `displayName`

#### Scenario: Delete is disabled

- **WHEN** the profile page renders
- **THEN** the «Удалить» button is rendered disabled

### Requirement: Profile data editing

The profile page SHALL group the locale-dependent fields familyName, givenName and displayName into a «Профильные данные» section with a `LocaleTabs` switcher (ru/en), editing the active locale's values. The `displayName` field SHALL be required for every locale: an empty display name on the active tab SHALL show an inline error and block saving, and on save an empty `displayName` in any locale other than the active one SHALL be filled from the active locale's value. Saving SHALL persist all locales via `userService.updateUser` (owner update, role untouched) and refresh the cached `authUser` query. Save errors SHALL be shown as a dismissible alert.

#### Scenario: Locale switching

- **WHEN** the user switches the `LocaleTabs` from ru to en
- **THEN** the three fields show the en values without losing the edited ru values

#### Scenario: Empty display name blocks saving

- **WHEN** the active locale's `displayName` is empty
- **THEN** an inline error is shown under the field and «Сохранить» stays disabled

#### Scenario: Empty display name in other locales is filled on save

- **WHEN** the user saves while the active locale's `displayName` is non-empty and another locale's `displayName` is empty
- **THEN** `userService.updateUser` receives the active locale's `displayName` for the other locale as well

#### Scenario: Saving profile data

- **WHEN** the user edits a field and presses «Сохранить»
- **THEN** `userService.updateUser` is called with the full locales map and the cached auth user is updated

### Requirement: Authentication providers section

The profile page SHALL render a «Провайдеры аутентификации» section showing the user's auth providers (`firebaseUser.providerData`) as text badges with friendly labels (`google.com → Google`, `password → «Email / Пароль»`, others → raw id). Below the badges, a password block SHALL switch on whether a `password` provider exists:

- assigned → label «Сменить пароль» with fields «Старый пароль», «Новый пароль», «Повторить новый пароль», applied via reauthentication and `updatePassword`;
- not assigned → label «Добавить пароль» with fields «Новый пароль», «Повторить новый пароль», applied via `linkWithCredential` followed by a user reload.

The block SHALL have its own apply button (independent of the header «Сохранить») and inline validation: old password required in change mode, new password at least 6 characters, repeat must match. Firebase error codes SHALL map to localized messages. Every password field SHALL offer a show/hide visibility toggle, and a successful password operation SHALL show a success-styled message (not error-styled) that is cleared on new input or a new submit.

#### Scenario: Provider badges

- **WHEN** the user's `providerData` contains `google.com` and `password`
- **THEN** badges «Google» and «Email / Пароль» are rendered

#### Scenario: Changing an existing password

- **WHEN** a password is assigned and the user submits valid old/new/repeat values
- **THEN** reauthentication with the old password runs, then `updatePassword` with the new one

#### Scenario: Adding a password to a passwordless account

- **WHEN** no password provider exists and the user submits valid new/repeat values
- **THEN** `linkWithCredential` is called with the new password and the user is reloaded

#### Scenario: Password validation

- **WHEN** the repeat does not match the new password, the new password is shorter than 6 characters, or the old password is empty in change mode
- **THEN** an inline error is shown and the apply button stays disabled

#### Scenario: Wrong old password

- **WHEN** reauthentication fails with `auth/wrong-password`
- **THEN** the localized wrong-password message is shown near the old password field

#### Scenario: Success message styling

- **WHEN** a password operation succeeds
- **THEN** the success message is rendered with the success text color and disappears when the user edits a field again

#### Scenario: Password visibility toggle

- **WHEN** the user clicks the show/hide toggle on a profile password field
- **THEN** the field switches between masked and plain text input