## MODIFIED Requirements

### Requirement: Admin drawer closes on logout

The application SHALL close the admin drawer and navigate to the home page (`/`) when the authenticated session ends (the user logs out), so no authenticated-only surface remains for unauthenticated visitors.

#### Scenario: Logging out with the drawer open

- **WHEN** the user logs out while the admin drawer is open
- **THEN** the drawer closes automatically
- **AND** the application navigates to the home page

#### Scenario: Logging out from an authenticated page

- **WHEN** the user logs out while on an authenticated-only page (e.g. a tournament edit page)
- **THEN** the application navigates to the home page
- **AND** unauthenticated visits to that page afterwards redirect to `/login`