## Why

Post-implementation review of the profile page surfaced five issues: the display name is optional (a user can save a profile with no name in a locale and lose the header title), profiles created via Google sign-in or registration can get 'Placeholder' names, the password success message is styled like an error, password fields cannot be unmasked, and the admin drawer stays open after logout.

## What Changes

- Make `displayName` a required field for every locale on the profile page: an empty display name on the active tab shows an inline error and blocks «Сохранить»; on save, an empty `displayName` in any other locale is filled from the active tab's value.
- Fall back the live header title (`h1` and `document.title`) to the active locale's `displayName`, then to the localized «Без имени».
- Stop creating 'Placeholder' names: auth flows split the real display name into givenName/familyName (first token → givenName) and store the real `displayName` in every locale.
- Style the password management success message as success (green) instead of error red, and clear it on new input or a new submit.
- Add a reusable password input with a show/hide visibility toggle and use it in the login/registration form and all three profile password fields.
- Close the admin drawer automatically when the user logs out.

## Capabilities

### Modified Capabilities
- `profile-page`: `displayName` required in all locales, header title fallback, password success styling and password visibility toggles.

### Added Capabilities
- `auth-profile-naming`: profile naming from auth flows (registration and provider sign-in).
- `auth-password-visibility`: password visibility toggles on the auth form and profile password block.
- `admin-drawer-session`: the admin drawer closes when the session ends.