## MODIFIED Requirements

### Requirement: Blocked-user notice after forced logout

When a session is terminated because of blocking, the application SHALL store a notice flag (scoped to the tab session) and the layout SHALL render a localized dismissal alert with the same "user blocked" text while the flag is set. Dismissing the alert or starting a new session clears the flag. When a user with a stored notice flag successfully authenticates and the loaded profile is not blocked, the application SHALL clear the stale flag so the notice does not reappear.

#### Scenario: Notice shown after forced logout

- **WHEN** a session is terminated due to blocking and the user lands on any page
- **THEN** the layout shows the localized "user blocked" alert
- **AND** dismissing it hides the alert and clears the stored flag

#### Scenario: No notice in normal sessions

- **WHEN** the user signs out manually or no block occurred
- **THEN** no blocked-notice alert is rendered

#### Scenario: Stale flag is cleared after successful authentication

- **WHEN** a notice flag is stored and the user signs in (or restores a session) with a profile that is not blocked
- **THEN** the stored flag is cleared and the notice is not shown again
