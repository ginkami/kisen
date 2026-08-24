## ADDED Requirements

### Requirement: Tournament status lifecycle

The tournament status SHALL be derived from the tournament's data on every save (`TournamentService.update`), computed from the merged state being written (games, currentRound, schedule) rather than the previously stored state:

- **publish:** `publish()` requests `upcoming`; if round-1 pairings already exist in the stored tournament, the status SHALL become `ongoing` immediately.
- **first draw:** when `currentRound >= 1` (a draw has been published) or any game exists for round 1, the status SHALL be `ongoing`.
- **finished:** when the last round of the schedule has at least one game and every game of that round has a fixed outcome (`result != null` or status `bye`/`forfeit`), the status SHALL be `finished`.
- **time fallback:** when the first round's `scheduledAt` has passed and no draw has been published, `upcoming` SHALL become `ongoing`.
- **symmetric rollback:** removing the last fixed outcome SHALL roll `finished` back to `ongoing`; unpublishing all draws (`currentRound = 0`, no round-1 pairings) with the first round's start time not yet reached SHALL roll `ongoing` back to `upcoming`.
- **sticky manual statuses:** `draft` SHALL only leave via the publish action; `canceled` and `proposed_for_removing` SHALL change only through an explicit status input.

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

- **WHEN** the last round's games all have status `bye` or `forfeit`
- **THEN** the status is `finished`

#### Scenario: Empty last round is not finished

- **WHEN** the last round of the schedule has no games
- **THEN** the status is not `finished`

#### Scenario: Removing the last result rolls back to ongoing

- **WHEN** a `finished` tournament's last-round result is removed (cycles back to undecided)
- **THEN** the status becomes `ongoing` on save

#### Scenario: Unpublishing all draws rolls back to upcoming

- **WHEN** an `ongoing` tournament has `currentRound = 0`, no round-1 pairings, and the first round's start time has not passed
- **THEN** the status becomes `upcoming` on save

#### Scenario: Time-based fallback

- **WHEN** a published tournament has no draws and the first round's `scheduledAt` passes
- **THEN** the next save sets the status to `ongoing`

#### Scenario: Canceled is sticky

- **WHEN** the status is `canceled` and the tournament is saved with data that would otherwise imply `ongoing`
- **THEN** the status remains `canceled`