## ADDED Requirements

### Requirement: Profile page access and header

The application SHALL serve an authenticated profile page at `/profile` that redirects unauthenticated visitors to `/login` and shows a loading spinner while the auth state resolves. The page header SHALL show an over-title «Редактирование и управление профилем», an `h1` with `{familyName} {givenName}` of the current locale rendered from the form state (updating live while the user edits these fields), a «Сохранить» button disabled until the form has changes, and a «Удалить» button that stays disabled until deletion logic is implemented.

#### Scenario: Unauthenticated visitor

- **WHEN** an unauthenticated user opens `/profile`
- **THEN** they are redirected to `/login`

#### Scenario: Live header title

- **WHEN** the user edits familyName or givenName for the current locale
- **THEN** the `h1` updates immediately to `{familyName} {givenName}` of the edited values

#### Scenario: Save gating

- **WHEN** the profile form has no changes
- **THEN** the «Сохранить» button is disabled and becomes enabled after the first edit

#### Scenario: Delete is disabled

- **WHEN** the profile page renders
- **THEN** the «Удалить» button is rendered disabled

### Requirement: Immutable account fields

The profile page SHALL render an unnamed section showing the user's Email and Role (localized via `profile.edit.roles.*`), side by side in two columns on large screens. These fields SHALL NOT be editable.

#### Scenario: Account facts display

- **WHEN** the profile page renders for a user with email `user@example.com` and role `manager`
- **THEN** the section shows `user@example.com` and the localized role name

### Requirement: Profile data editing

The profile page SHALL group the locale-dependent fields familyName, givenName and displayName into a «Профильные данные» section with a `LocaleTabs` switcher (ru/en), editing the active locale's values. Saving SHALL persist all locales via `userService.updateUser` (owner update, role untouched) and refresh the cached `authUser` query. Save errors SHALL be shown as a dismissible alert.

#### Scenario: Locale switching

- **WHEN** the user switches the `LocaleTabs` from ru to en
- **THEN** the three fields show the en values without losing the edited ru values

#### Scenario: Saving profile data

- **WHEN** the user edits a field and presses «Сохранить»
- **THEN** `userService.updateUser` is called with the full locales map and the cached auth user is updated

### Requirement: Authentication providers section

The profile page SHALL render a «Провайдеры аутентификации» section showing the user's auth providers (`firebaseUser.providerData`) as text badges with friendly labels (`google.com → Google`, `password → «Email / Пароль»`, others → raw id). Below the badges, a password block SHALL switch on whether a `password` provider exists:

- assigned → label «Сменить пароль» with fields «Старый пароль», «Новый пароль», «Повторить новый пароль», applied via reauthentication and `updatePassword`;
- not assigned → label «Добавить пароль» with fields «Новый пароль», «Повторить новый пароль», applied via `linkWithCredential` followed by a user reload.

The block SHALL have its own apply button (independent of the header «Сохранить») and inline validation: old password required in change mode, new password at least 6 characters, repeat must match. Firebase error codes SHALL map to localized messages.

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

### Requirement: Managed associations shortcuts

The profile page SHALL render an «Ассоциации, которыми управляете» section listing associations the user created (badged with «(создатель)») or is listed in `managers`, as badges linking to `/assn/:id/edit`. When there are none, the section SHALL show a localized empty hint.

#### Scenario: Creator badge

- **WHEN** the user created an association
- **THEN** its badge shows the localized association title with the «(создатель)» mark and links to `/assn/{id}/edit`

#### Scenario: Manager badge

- **WHEN** the user is a manager (not creator) of an association
- **THEN** its badge shows the title without the creator mark and links to `/assn/{id}/edit`

#### Scenario: No managed associations

- **WHEN** `useMyAssociations` returns an empty list
- **THEN** the section shows a localized "no associations" hint
