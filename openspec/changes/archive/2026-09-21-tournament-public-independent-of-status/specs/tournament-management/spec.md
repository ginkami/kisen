## MODIFIED Requirements

### Requirement: Tournament status lifecycle

The tournament status SHALL be derived from the tournament's data on every save (`TournamentService.update`), computed from the merged state being written (games, currentRound, schedule) rather than the previously stored state:

- **publish:** `publish()` requests `upcoming` and sets `isPublic: true`; if round-1 pairings already exist in the stored tournament, the status SHALL become `ongoing` immediately.
- **first draw:** when `currentRound >= 1` (a draw has been published) or any game exists for round 1, the status SHALL be `ongoing`.
- **finished:** when the last round of the schedule is published (`publishedRounds` >= its number), has at least one game, and every game of that round has a fixed outcome (`result != null` or status `bye`/`forfeit`), the status SHALL be `finished`. Carried-over forfeit games in a not-yet-published last round SHALL NOT mark the tournament `finished`.
- **time fallback:** when the first round's `scheduledAt` has passed and no draw has been published, `upcoming` SHALL become `ongoing`.
- **symmetric rollback:** removing the last fixed outcome SHALL roll `finished` back to `ongoing`; unpublishing all draws (`currentRound = 0`, no round-1 pairings) with the first round's start time not yet reached SHALL roll `ongoing` back to `upcoming`.
- **sticky manual statuses:** `draft` SHALL only leave via the publish action; `canceled` and `proposed_for_removing` SHALL change only through an explicit status input.

The `isPublic` flag SHALL be independent of the status: it SHALL mean only "the tournament is visible on the site" and MAY be `true` for any status. `update()` SHALL NOT derive `isPublic` from the status — it SHALL write `input.isPublic` when provided and otherwise keep the stored value. The new `unpublish()` service action SHALL set `isPublic: false` without changing the status. The Firestore rules SHALL NOT enforce any `isPublic`↔`status` invariant.

#### Scenario: Publishing a tournament without pairings

- **WHEN** the user publishes a tournament that has no round-1 games
- **THEN** the status becomes `upcoming`

#### Scenario: Publishing a tournament with existing round-1 pairings

- **WHEN** the user publishes a tournament whose stored games include round-1 pairings
- **THEN** the status becomes `ongoing` immediately

#### Scenario: Publishing the first draw starts the tournament

- **WHEN** the tournament status is `upcoming` and the user publishes the round-1 draw (currentRound becomes 1)
- **THEN** the status becomes `ongoing`

#### Scenario: Fixing the last result of the last round finishes the tournament

- **WHEN** the tournament has 3 rounds, round 3 has games, and the user records a result for the last game of round 3 without a fixed outcome
- **THEN** the status becomes `finished`

#### Scenario: Bye and forfeit count as fixed outcomes

- **WHEN** the last round of the schedule is published and its games all have status `bye` or `forfeit`
- **THEN** the status is `finished`

#### Scenario: Carried forfeits in an unpublished last round do not finish the tournament

- **WHEN** publishing a round carries forfeit games into the last scheduled round while that round is still unpublished (`publishedRounds` < its number)
- **THEN** the status is not `finished`

#### Scenario: Empty last round is not finished

- **WHEN** the last round of the schedule has no games
- **THEN** the status is not `finished`

#### Scenario: Removing the last result rolls back to ongoing

- **WHEN** a `finished` tournament's last-round result is removed (cycles back to undecided)
- **THEN** the status becomes `ongoing` on save

#### Scenario: Unpublishing all draws rolls back to upcoming

- **WHEN** an `ongoing` tournament has `currentRound = 0`, no round-1 pairings, and the first round's start time has not yet reached
- **THEN** the status becomes `upcoming` on save

#### Scenario: Time-based fallback

- **WHEN** a published tournament has no draws and the first round's `scheduledAt` passes
- **THEN** the next save sets the status to `ongoing`

#### Scenario: Canceled is sticky

- **WHEN** the status is `canceled` and the tournament is saved with data that would otherwise imply `ongoing`
- **THEN** the status remains `canceled`

#### Scenario: Draft tournament can be public

- **WHEN** a `draft` tournament is updated with `isPublic: true`
- **THEN** the saved document keeps `status: 'draft'` and has `isPublic: true`

#### Scenario: Save without isPublic input keeps the stored visibility

- **WHEN** a hidden (`isPublic: false`) tournament of a public status (e.g. `upcoming`) is saved without an `isPublic` input
- **THEN** the saved document keeps `isPublic: false`

#### Scenario: Unpublish keeps the status

- **WHEN** `unpublish()` is called for an `ongoing` public tournament
- **THEN** the saved document has `isPublic: false` and `status: 'ongoing'`

### Requirement: Pairing tools drawer availability

The tournament edit page SHALL render the "Pairing assistant" drawer (`PairingToolsDrawer`) and its toggle buttons only when all of the following hold: the "Pairings" tab OR the "Crosstable" tab is active, and the form state is loaded — regardless of the tournament status. On the "Pairings" tab the drawer and its toggle buttons SHALL be available for every active round sub-tab (not only the round being prepared); on the "Crosstable" tab only the side sticky `FaPeopleArrows` tab SHALL be shown. The drawer and its toggle buttons SHALL NOT be rendered in any other state. When the availability conditions stop holding while the drawer is open, the drawer SHALL disappear. The sticky `FaPeopleArrows` tab SHALL show the tooltip «Открыть панель жеребьёвки».

#### Scenario: Drawer available on any round sub-tab of the pairings tab

- **WHEN** a tournament edit page (any status, e.g. `draft` or `upcoming`) shows the "Pairings" tab with any round sub-tab active
- **THEN** the pairing tools drawer toggle buttons are displayed

#### Scenario: Crosstable tab shows only the sticky tab

- **WHEN** a tournament edit page shows the "Crosstable" tab and the drawer is closed
- **THEN** only the side sticky `FaPeopleArrows` tab is displayed, with the tooltip «Открыть панель жеребьёвки»
- **AND** no pairings-board header toggle is rendered

#### Scenario: Drawer unavailable on other tabs

- **WHEN** the active tab is neither "Pairings" nor "Crosstable"
- **THEN** neither the drawer nor its toggle buttons are displayed

## ADDED Requirements

### Requirement: Unpublish (Скрыть) button in the edit form header

The tournament edit form header SHALL render publication controls between the «Сохранить» / "Save" button and the «Удалить» / "Delete" button, driven by the stored `isPublic` value and alternating: when `isPublic === false` a «Опубликовать» / "Publish" button SHALL be rendered for a tournament of any status (not only `draft`); when `isPublic === true` a «Скрыть» / "Unpublish" button SHALL be rendered. Confirming the publish action SHALL keep the existing publish flow (validation, confirmation dialog, `publish()`). Confirming the unpublish action SHALL open a confirmation dialog and then call `useTournamentForm.unpublish()`, which SHALL set `isPublic: false` without changing the status and without saving the dirty form state. Both buttons SHALL be disabled while a save, publish, unpublish, or delete operation is in flight.

#### Scenario: Publish button for a non-draft hidden tournament

- **WHEN** an `upcoming` tournament with `isPublic === false` is opened in the edit form
- **THEN** the header shows the «Опубликовать» button between «Сохранить» and «Удалить»

#### Scenario: Unpublish button for a public tournament

- **WHEN** a tournament with `isPublic === true` is opened in the edit form
- **THEN** the header shows the «Скрыть» / "Unpublish" button between «Сохранить» and «Удалить»
- **AND** the «Опубликовать» button is not rendered

#### Scenario: Unpublish confirmation hides the tournament

- **WHEN** the user confirms the unpublish dialog
- **THEN** the tournament is saved with `isPublic: false`
- **AND** the status is unchanged
- **AND** afterwards the header shows the «Опубликовать» button instead of «Скрыть»

#### Scenario: Unpublish i18n strings

- **WHEN** the ru or en locale dictionary is inspected
- **THEN** `tournament.edit.unpublish` equals «Скрыть» / "Unpublish" respectively
- **AND** unpublish confirmation title and message keys exist in both locales
