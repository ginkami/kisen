# Delta spec: tournament-management

## ADDED Requirements

### Requirement: Participant removal removes their games

When a participant is removed from the tournament draft — either explicitly via `removeParticipant` or implicitly when `rowsToParticipants` filters out an empty participant row on save — the system SHALL also remove that participant's games from the draft `games` array: (1) every lone game (`player2 = null`) of the removed participant in all rounds (forfeits, byes, and carry-over forfeits); (2) every paired game of the removed participant in rounds greater than `currentRound` (their former opponent in such a round becomes unpaired). Paired games of the removed participant in published rounds (`round <= currentRound`) SHALL be preserved so published results and standings history are not rewritten.

#### Scenario: Removing a participant with lone forfeit games

- **WHEN** a participant has lone forfeit games (created by forfeit toggle, auto-forfeit, or carry-over) in rounds 1–3 and the user removes that participant
- **THEN** all of those lone games are removed from the draft
- **AND** no game referencing the removed participant id remains in the draft

#### Scenario: Removing a participant with a pairing in the prepared round

- **WHEN** a participant is paired in a game with `round = currentRound + 1` and the user removes that participant
- **THEN** that paired game is removed
- **AND** the former opponent has no game in that round (becomes unpaired)

#### Scenario: Removing a participant keeps published paired games

- **WHEN** a participant has paired games with results in published rounds (`round <= currentRound`) and the user removes that participant
- **THEN** those paired games remain in the draft unchanged
- **AND** the opponents' results in those rounds are preserved

#### Scenario: Saving with an empty participant row drops its games

- **WHEN** the user saves a tournament where a participant row has no familyName and no givenName in any locale, but that row's id has lone games in the draft (for example from a cleared row)
- **THEN** the row is not persisted as a participant
- **AND** the lone games of that row's id are removed from the saved `games` array

## MODIFIED Requirements

### Requirement: Auto-forfeit for late joiners in past rounds

When a new participant is added via `addParticipant` and `currentRound > 0`, the system SHALL automatically create forfeit games for that participant in all rounds `1..currentRound`, except rounds where the new participant's id already has a game (as `player1` or `player2`) — such rounds SHALL be skipped. Each forfeit game SHALL have `player1` = new participant id, `player2 = null`, `status = 'forfeit'`, `result = 'player2_won'`, `sente = considerSente ? 'player1' : 'unknown'`, and `round` = the respective round number.

#### Scenario: New participant added mid-tournament gets forfeits for past rounds

- **WHEN** a new participant is added while `currentRound = 3`
- **THEN** forfeit games are created for rounds 1, 2, and 3 for that participant
- **AND** each game has `status = 'forfeit'` and `result = 'player2_won'`

#### Scenario: New participant added before first round gets no forfeits

- **WHEN** a new participant is added while `currentRound = 0`
- **THEN** no forfeit games are created

#### Scenario: Reused id with existing games gets no duplicate forfeits

- **WHEN** a new participant receives an id that still has a game in rounds 1 and 3 (for example orphaned forfeits of a previously removed participant with the same id) and is added while `currentRound = 3`
- **THEN** a forfeit game is created only for round 2
- **AND** rounds 1 and 3 keep exactly one game for that participant id
