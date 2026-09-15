## Purpose

Pure single-elimination (knockout) engine: detects a strict knockout bracket in the played rounds, forms canonical knockout rounds for the round being prepared (strict seeding by points then rating, abstract bottom padding to the next power of two with byes to top seeds, bracket-tree continuation without reseeding, elimination via forfeit games), and computes the «1/{n} финала» round label (n = pairs + byes of the round).

## Requirements

### Requirement: Strict bracket analysis

The knockout engine (`analyzeKnockoutBracket`) SHALL determine whether the published rounds form a strict single-elimination bracket covering all participants that are not excluded before the bracket: there exists a start round `s` such that (1) round `s` covers every participant with paired games, byes, and lone forfeit games only, where a lone forfeit game (`status: 'forfeit'`, `result: 'player2_won'`) marks a participant excluded from the bracket before it started (manual elimination or carried forfeit), (2) byes occur only in round `s`, (3) the paired games of round `s` match the canonical strict seeding (1 vs last, 2 vs second-last, …) of the participants not excluded in round `s`, sorted by points before round `s` (then rating), padded to the next power of two with bottom virtual seeds, excluded participants SHALL NOT appear in any other game of round `s`, and (4) every later round `r` pairs exactly the winners of round `r−1` per bracket adjacency (winners of adjacent bracket slots) and gives every eliminated player — losers of the bracket rounds and the participants excluded in round `s` — exactly one lone forfeit game. On success the engine SHALL return the bracket for continuation; otherwise it SHALL report that no bracket exists.

#### Scenario: Canonical knockout history is recognized

- **WHEN** the published rounds form a canonical knockout starting at round `s` (strict seeding round, then bracket-tree rounds with forfeit games for eliminated players)
- **THEN** `analyzeKnockoutBracket` returns the bracket with start round `s`

#### Scenario: Swiss history is not a bracket

- **WHEN** the published rounds are Swiss rounds (all participants paired in every round, no elimination)
- **THEN** no bracket is reported

#### Scenario: Broken continuation is not a bracket

- **WHEN** a later round pairs a winner against a non-adjacent bracket opponent, or an eliminated player misses their forfeit game
- **THEN** no bracket is reported

#### Scenario: Knockout starting after manual eliminations is recognized

- **WHEN** the knockout round 1 (start round `s`) pairs only the active participants canonically while participants eliminated before the bracket have lone forfeit games in round `s` and keep sitting out with a forfeit game in every later round
- **THEN** `analyzeKnockoutBracket` returns the bracket with start round `s`, and the round after the semifinals is planned as the final (n = 1, «Сформировать пары финала»)

### Requirement: Canonical knockout round 1 seeding

When no bracket exists (or the existing one is not continued), the engine SHALL treat the round being prepared as knockout round 1: all participants except those eliminated by manual forfeit games of the round SHALL be sorted by points after the published rounds (first criterion) and rating (second criterion), padded abstractly to the next power of two with bottom virtual seeds, and paired by strict seeding (1 vs last, 2 vs second-last, …). A real player drawn against a virtual seed SHALL receive a bye (`status: 'bye'`, `result: 'player1_won'`), so byes always go to top seeds. Existing manual paired games of the round SHALL be kept (both players excluded from the seeding); the remaining players SHALL be seeded canonically. If the manual pre-pairing makes the canonical form impossible, the engine SHALL fail with a pairing error.

#### Scenario: Six players with bottom padding

- **WHEN** knockout round 1 is generated for 6 participants
- **THEN** the pairs are seed 3 vs 6 and seed 4 vs 5, and seeds 1 and 2 receive byes (n = 2 + 2 = 4 → «1/4 финала»)

#### Scenario: Byes go to top seeds

- **WHEN** the participant count is not a power of two
- **THEN** the byes are assigned to the highest seeds (sorted by points, then rating)

#### Scenario: Manual pairs are kept and the rest is seeded

- **WHEN** the round already contains manual paired games between active participants
- **THEN** those games are kept unchanged
- **AND** the remaining participants are seeded canonically among themselves

#### Scenario: Manual forfeit eliminates a player

- **WHEN** the round contains a manual lone forfeit game for a participant
- **THEN** that participant is considered eliminated: excluded from seeding and counted out of {n}

#### Scenario: Impossible canonical form

- **WHEN** the manual pre-pairing makes the canonical knockout impossible (e.g. a participant placed twice)
- **THEN** the engine fails with a pairing error and no games are modified

### Requirement: Bracket continuation

When a strict bracket exists and the current round's manual games do not break it (manual paired games are between bracket-adjacent active players; manual forfeit games are for already-eliminated players), the engine SHALL form the bracket's next-round pairs for all remaining active players and give forfeit games to every eliminated player. Reseeding SHALL NOT occur — pairs follow the fixed bracket tree.

#### Scenario: Winners meet per the bracket

- **WHEN** a bracket round is continued after all previous-round games have results
- **THEN** each pair consists of winners of adjacent bracket slots of the previous round

#### Scenario: Eliminated players get forfeit games

- **WHEN** the engine forms a knockout round
- **THEN** every eliminated player receives exactly one lone forfeit game (`status: 'forfeit'`, `result: 'player2_won'`) in that round

### Requirement: Final-round label computation

The drawer's knockout button label «Сформировать пары 1/{n} финала» SHALL use `n` = the number of pairs plus byes of the formed round, equal to the number of active players after the round (bracket size / 2). The label fragment SHALL be computed from the tournament state without the round's own games, so it SHALL remain unchanged for the current round once computed; when n = 1 the label SHALL read «Сформировать пары финала». Examples: 6, 7 or 8 participants entering the round → n = 4 («1/4 финала»); 16 active players → n = 8 («1/8 финала»).

#### Scenario: First knockout round of six players

- **WHEN** knockout round 1 is formed for 6 participants (2 pairs + 2 byes)
- **THEN** the button label shows «1/4 финала»

#### Scenario: Continuation round of eight active players

- **WHEN** the bracket continues with 8 active players (4 pairs)
- **THEN** the button label shows «1/8 финала»

### Requirement: Single-action application

The knockout generation result SHALL be applied via a single round update (one undo/redo history action). The drawer's knockout button SHALL be disabled under the same Swiss completeness condition as the Swiss actions (any round from 1 to `publishedRounds` with a paired game without a result or a participant without a game). The «1/{n} финала» label fragment SHALL be computed from the tournament state without the round's own games (stable for the current round), and when n = 1 the label SHALL read «финала».

#### Scenario: One history action per knockout generation

- **WHEN** the user clicks the knockout generation button
- **THEN** all formed games (pairs, byes, forfeit games) are applied with one round update
- **AND** the undo/redo history records exactly one new state
