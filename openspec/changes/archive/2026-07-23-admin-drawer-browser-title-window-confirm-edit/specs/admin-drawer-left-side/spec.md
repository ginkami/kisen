## ADDED Requirements

### Requirement: Admin drawer renders on the left side of the viewport
The system SHALL render the admin drawer panel anchored to the left edge of the screen when open, and the sticky toggle button SHALL also be anchored to the left edge when the drawer is closed.

#### Scenario: Drawer opens from the left
- **WHEN** the admin drawer is open
- **THEN** the drawer panel is visible on the left side of the screen

#### Scenario: Toggle button is on the left
- **WHEN** the admin drawer is closed and the user is authenticated
- **THEN** a sticky toggle button appears on the left edge of the screen

### Requirement: Admin drawer uses a settings icon
The system SHALL display the `Cog8ToothIcon` from `@heroicons/react/24/outline` in both the sticky toggle button and the drawer header, replacing the previous `TrophyIcon`.

#### Scenario: Toggle button shows settings icon
- **WHEN** the drawer toggle button is rendered
- **THEN** it contains the `Cog8ToothIcon`

#### Scenario: Drawer header shows settings icon
- **WHEN** the admin drawer header is rendered
- **THEN** it contains the `Cog8ToothIcon` next to the admin panel title
