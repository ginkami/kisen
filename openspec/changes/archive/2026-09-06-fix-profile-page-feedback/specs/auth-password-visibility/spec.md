## ADDED Requirements

### Requirement: Password visibility toggles

Password inputs in the login/registration form and in the profile password management block SHALL render a show/hide toggle button with localized accessible names («Показать пароль» / «Скрыть пароль») that switches the field between masked and plain text.

#### Scenario: Toggling visibility in the auth form

- **WHEN** the user clicks the toggle on the auth form password field
- **THEN** the field switches between `type="password"` and `type="text"`

#### Scenario: Toggling visibility in the profile password block

- **WHEN** the user clicks the toggle on a profile password field
- **THEN** the field switches between masked and plain text