## ADDED Requirements

### Requirement: Admin drawer closes on logout

The application SHALL close the admin drawer when the authenticated session ends (the user logs out), so the drawer is not left open for unauthenticated visitors.

#### Scenario: Logging out with the drawer open

- **WHEN** the user logs out while the admin drawer is open
- **THEN** the drawer closes automatically