## ADDED Requirements

### Requirement: Optimistic concurrency control for tournament edits

The tournament document SHALL carry a monotonic integer `revision` (0 for new and legacy documents). Saving an edited tournament SHALL run inside a Firestore transaction that compares the revision the editor loaded with the stored revision and SHALL throw a typed conflict error on mismatch; a successful save SHALL increment the revision. The Firestore rule for tournament updates SHALL enforce the same increment. When a save fails with a conflict, the edit form SHALL show a banner stating that the tournament was changed by another manager or tab, with two actions: «Перезагрузить» (discards the local form state after copying it to the clipboard) and «Сохранить принудительно» (saves over the fresh revision, intentionally overwriting the other editor's changes).

#### Scenario: Second save after a conflicting write is rejected

- **WHEN** editor A and editor B load revision 5, A saves revision 6, and B then saves with revision 5
- **THEN** B's save fails with a conflict error and the stored document remains at revision 6 with A's content

#### Scenario: Successful save increments the revision

- **WHEN** an editor saves with the current stored revision
- **THEN** the stored document is written with `revision + 1`

#### Scenario: Conflict banner offers reload and force-save

- **WHEN** a save fails with a conflict
- **THEN** the form shows the conflict banner and the unsaved form state is copied to the clipboard when «Перезагрузить» is pressed
- **AND** «Сохранить принудительно» persists the local state over the fresh revision

### Requirement: Realtime change awareness in the edit form

The edit form SHALL subscribe to the tournament document while open. When a remote change (a revision newer than the one the form holds) arrives while the form is clean, the form SHALL silently refresh to the remote state. When it arrives while the form is dirty, the form SHALL show a non-blocking banner about the newer revision with the same reload/force-save actions as a save conflict. The editor's own successful saves SHALL NOT trigger the banner.

#### Scenario: Clean form follows remote changes

- **WHEN** another manager saves the tournament while the local form has no unsaved changes
- **THEN** the form state updates to the remote revision without user action

#### Scenario: Dirty form is warned instead of overwritten

- **WHEN** another manager saves while the local form has unsaved changes
- **THEN** a banner informs about the newer revision and the local changes remain in the form

### Requirement: Editing presence indicator

While the edit form is open, the editor SHALL announce itself in the tournament's sessions subcollection (one document per editor, keyed by user id) with a heartbeat at least every 15 seconds, and SHALL remove its document on unmount (best effort). Sessions without a heartbeat for more than 30 seconds SHALL be treated as stale and not displayed. The form header SHALL list the display names of other current editors («Сейчас редактируют: …»), excluding the local session.

#### Scenario: Two managers see each other

- **WHEN** managers A and B both have the edit form open
- **THEN** A's header lists B and B's header lists A, each excluding themselves

#### Scenario: Stale sessions disappear

- **WHEN** an editor closes the tab without cleanup
- **THEN** their session stops being listed once the heartbeat expires (30 s)
