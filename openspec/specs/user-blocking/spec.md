## Purpose

End-to-end enforcement of the user block flag (`users/{uid}.auth.isActive === false`): sign-in rejection with a localized error, live termination of active sessions with a dismissal notice, exclusion of blocked users from the manager invite search, and Firestore rules gating all content writes.

## Requirements

### Requirement: Blocked users cannot sign in

After a successful Firebase authentication (email/password or Google), the sign-in flow SHALL load the user's profile and, when `auth.isActive === false`, sign the Firebase session out, clear the cached profile, and fail with a localized error message («Данный пользователь временно заблокирован»). The auth form SHALL display this message in its existing error alert. Profiles without an `auth` field or without `auth.isActive` (legacy documents) SHALL be treated as active.

#### Scenario: Blocked user attempts email sign-in

- **WHEN** a user with `auth.isActive === false` signs in with valid email credentials
- **THEN** the Firebase session is signed out
- **AND** the auth form shows the localized "user blocked" message
- **AND** no authenticated page is rendered

#### Scenario: Blocked user attempts Google sign-in

- **WHEN** a user with `auth.isActive === false` signs in with Google
- **THEN** the Firebase session is signed out and the localized "user blocked" message is shown

#### Scenario: Active user signs in

- **WHEN** a user with an active profile signs in
- **THEN** sign-in succeeds and the profile is cached as before

#### Scenario: Legacy profile without auth data

- **WHEN** the user's document has no `auth` field or no `auth.isActive` value
- **THEN** the user is treated as active and sign-in succeeds

### Requirement: Active sessions of blocked users are terminated

While the user is signed in, the application SHALL subscribe to updates of its own `users/{uid}` document. When a server-sourced snapshot arrives with `auth.isActive === false`, the application SHALL sign the session out immediately, clear the cached profile, and store a dismissal notice flag. Snapshots served from the persistent local cache SHALL be ignored, so a stale cached flag cannot block a fresh sign-in after the block was lifted. After the forced sign-out the user is on an unauthenticated surface (existing guards redirect authenticated-only pages to `/login`).

#### Scenario: Admin blocks an active session

- **WHEN** the user's `auth.isActive` flips to `false` while the user is signed in
- **THEN** the session is signed out automatically
- **AND** the profile cache is cleared

#### Scenario: Blocked user revisits the application

- **WHEN** a blocked user restores a session (e.g. after a page reload)
- **THEN** the profile snapshot reports the block and the session is signed out

#### Scenario: Stale local cache does not block re-login

- **WHEN** the block was lifted and the local cache still serves a snapshot with `auth.isActive === false`
- **THEN** the cache-sourced snapshot is ignored and the user can sign in

### Requirement: Blocked-user notice after forced logout

When a session is terminated because of blocking, the application SHALL store a notice flag (scoped to the tab session) and the layout SHALL render a localized dismissal alert with the same "user blocked" text while the flag is set. Dismissing the alert or starting a new session clears the flag.

#### Scenario: Notice shown after forced logout

- **WHEN** a session is terminated due to blocking and the user lands on any page
- **THEN** the layout shows the localized "user blocked" alert
- **AND** dismissing it hides the alert and clears the stored flag

#### Scenario: No notice in normal sessions

- **WHEN** the user signs out manually or no block occurred
- **THEN** no blocked-notice alert is rendered

### Requirement: Blocked users are excluded from the manager invite search

The user family-name search used by the association manager invite input SHALL NOT return users with `auth.isActive === false`. Legacy users without the flag remain included.

#### Scenario: Manager searches for a blocked user

- **WHEN** the search matches a user whose `auth.isActive === false`
- **THEN** that user is not included in the results

#### Scenario: Active users remain searchable

- **WHEN** the search matches users with `auth.isActive === true` or without the flag
- **THEN** those users are included in the results

### Requirement: Firestore rules deny writes for blocked users

The Firestore rules SHALL provide an `isUserActive()` helper that reads the caller's `users/{uid}` document and treats a missing `auth.isActive` as active. Every write rule for associations, players, tournaments, events, and regulations SHALL additionally require `isUserActive()`. The users `update` rule SHALL require `isUserActive()` and SHALL NOT allow a non-admin to modify `auth.isActive` (in addition to the existing `role` protection). Users `read` and `create` SHALL remain allowed so the client can detect blocking and sign up.

#### Scenario: Blocked user attempts a tournament write

- **WHEN** a user with `auth.isActive === false` attempts to create, update, or delete a tournament
- **THEN** the write is denied

#### Scenario: Blocked user attempts other content writes

- **WHEN** a blocked user attempts to write associations, players, events, or regulations
- **THEN** the write is denied

#### Scenario: Blocked user cannot un-block themselves

- **WHEN** a blocked user attempts to update their own profile setting `auth.isActive` to `true`
- **THEN** the update is denied

#### Scenario: Admin manages a blocked user's profile

- **WHEN** an admin updates a blocked user's profile (e.g. setting `auth.isActive` back to `true`)
- **THEN** the update is allowed

#### Scenario: Active users are unaffected

- **WHEN** a user with an active profile performs writes allowed by the existing rules
- **THEN** the writes succeed as before
