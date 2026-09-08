## ADDED Requirements

### Requirement: Drawer tournament list refreshes after tournament mutations

Creating a tournament draft, saving a tournament, publishing (or otherwise changing a tournament's status), and deleting a tournament SHALL invalidate the drawer's tournaments cache so that the month list and title search reflect the change without a full page reload. The invalidation SHALL target the `['tournaments']` query-key prefix, covering both the editable listing used by the month list and the search results.

#### Scenario: Newly created draft appears in the drawer list

- **WHEN** the user creates a tournament draft via the "+ Турнир" button
- **THEN** the drawer's tournaments cache is invalidated
- **AND** the new draft appears in the month list for its month without a page reload

#### Scenario: Saved changes appear in the drawer list

- **WHEN** the user saves tournament changes
- **THEN** the drawer's tournaments cache is invalidated

#### Scenario: Published status reflected in the drawer list

- **WHEN** the user publishes or otherwise changes a tournament's status
- **THEN** the drawer's tournaments cache is invalidated

#### Scenario: Deleted tournament disappears from the drawer list

- **WHEN** the user deletes a tournament
- **THEN** the drawer's tournaments cache is invalidated
- **AND** the tournament no longer appears in the month list or search results