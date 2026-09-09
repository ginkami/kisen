## ADDED Requirements

### Requirement: Application management entry in the admin panel

The admin drawer panel SHALL show a «Управление приложением» button as its first item, positioned above the accordion. The button SHALL be rendered only for users whose profile role is `admin` and SHALL navigate to `/app-admin` through the existing unsaved-changes navigation guard.

#### Scenario: Admin sees the entry button

- **WHEN** an admin opens the admin drawer
- **THEN** the «Управление приложением» button is the first item of the panel, above the accordion

#### Scenario: Non-admin does not see the entry button

- **WHEN** a user with role `manager` or `user` opens the admin drawer
- **THEN** the button is not rendered

#### Scenario: Opening the administration page

- **WHEN** the admin clicks the button
- **THEN** the application navigates to `/app-admin`

### Requirement: Application administration page access

The page at `/app-admin` SHALL be accessible only to users with the `admin` role. Non-admins SHALL see a localized access-restricted alert instead of the page content.

#### Scenario: Admin opens the page

- **WHEN** an admin opens `/app-admin`
- **THEN** the page content is rendered

#### Scenario: Non-admin opens the page

- **WHEN** a user with role `manager` or `user` opens `/app-admin`
- **THEN** a localized access-restricted alert is shown instead of the content

### Requirement: Application administration page layout

The page SHALL render the title «Управление приложением» and a tab panel using the daisyUI `tabs-lift` style. The panel SHALL contain a «Настройки» tab whose section is empty for now, with a neutral localized placeholder marking it as intentionally empty. The panel structure SHALL allow adding further tab/section pairs.

#### Scenario: Page layout

- **WHEN** an admin opens `/app-admin`
- **THEN** the title «Управление приложением» and a `tabs-lift` tab panel with the active «Настройки» tab are shown
- **AND** the settings section is empty with a placeholder
