## ADDED Requirements

### Requirement: Automatic Swiss pairing generation

The pairing engine (`generatePairings`) SHALL automatically pair all participants of the active round who do not yet have any game in that round, using a weighted graph of candidate pairs and the Edmonds blossom maximum-weight matching algorithm. Participants who already have a game in the active round (manual pairs, byes, carried-over forfeits) SHALL be excluded from the graph and their games SHALL NOT be altered. The engine SHALL return only the newly created games; the caller merges them with the existing round games via a single round update.

#### Scenario: All unpaired participants get paired

- **WHEN** the active round has participants without games and the engine runs
- **THEN** every such participant appears in exactly one new game (or has a bye, see the bye requirement)
- **AND** no game of a participant who already had a game in the round is created or changed

#### Scenario: Locked manual pairs are preserved

- **WHEN** the user has manually created some pairs in the active round before running the engine
- **THEN** those pairs and their results are returned unchanged
- **AND** the engine pairs only the remaining unpaired participants

#### Scenario: Full pairing impossible

- **WHEN** no valid full matching exists (e.g. an even number of unpaired players but every candidate pairing is forbidden)
- **THEN** the engine fails with a pairing error
- **AND** the UI shows the alert "Невозможно составить пары" without modifying any game

### Requirement: Hard pairing constraints

The engine SHALL treat the following as forbidden pairings (the edge is removed from the graph): a rematch between two participants who already played each other in any published round; a bye for a participant who already skipped a round (has a `bye` or `forfeit` game in any published round) — such a participant SHALL never receive another bye; and, when `settings.considerSente == true`, any pairing that in both sente orientations would give some participant a third identical color in a row or push a color balance (sente count minus gote count) beyond ±2.

#### Scenario: Rematch is forbidden

- **WHEN** two participants already have a game together in a published round
- **THEN** the engine never pairs them again in the active round

#### Scenario: No second skip

- **WHEN** a participant has a bye or forfeit game in a published round and the unpaired count is odd
- **THEN** that participant is not assigned the bye in the active round

#### Scenario: Color constraints with considerSente

- **WHEN** `considerSente` is true and a participant enters the round with two identical colors in a row, or a color balance of +2 or −2
- **THEN** the participant is only paired in an orientation that avoids a third identical color in a row and keeps the balance within ±2

#### Scenario: Color constraints ignored without considerSente

- **WHEN** `considerSente` is false
- **THEN** color history imposes no constraints and new games have `sente: 'unknown'`

### Requirement: Score-group dominance in weights

The engine SHALL apply an exponential penalty on the points difference between paired opponents that is guaranteed to outweigh the combined effect of all other weight components: any matching whose pairs have smaller maximum points difference SHALL always be preferred over any matching with a larger one. All other penalties (rating-related) SHALL be bounded below the smallest score-difference step.

#### Scenario: Same-score pairing preferred over any rating benefit

- **WHEN** the engine chooses between pairing a player within their score group versus across score groups where the cross-group pairing is far better by rating
- **THEN** the within-score-group pairing is always chosen

#### Scenario: Balanced pairing wins

- **WHEN** multiple full matchings exist entirely within score groups
- **THEN** the one with the smallest total rating-related penalty is chosen

### Requirement: Rating subgroup emulation inside score groups

Inside each score group the engine SHALL order players by rating and emulate the split into an upper and a lower subgroup: pairings inside the same half SHALL receive a larger penalty than pairings across halves, and the penalty for cross-half pairs SHALL grow with the deviation from the ideal alignment (the k-th player of the upper subgroup with the k-th player of the lower subgroup).

#### Scenario: Upper subgroup plays lower subgroup

- **WHEN** a score group with an even number of players must be paired internally
- **THEN** the chosen matching pairs upper-half players with lower-half players rather than within one half

#### Scenario: Rating order respected

- **WHEN** several upper↔lower matchings have equal structure
- **THEN** the matching closer to the ideal rating-list alignment is chosen

### Requirement: Bye assignment via virtual node

When the number of unpaired participants is odd, the engine SHALL add a virtual bye vertex to the matching graph so that exactly one participant receives a bye (a lone game with `status: 'bye'`, `result: 'player1_won'`). The bye edge SHALL be forbidden for participants who already skipped a published round, and otherwise penalized so the bye goes to the participant with the fewest points (rating as tie-break, lowest preferred).

#### Scenario: Weakest player gets the bye

- **WHEN** the unpaired count is odd and several participants are eligible for a bye
- **THEN** the participant with the fewest points (lowest rating as tie-break) receives the bye

#### Scenario: Exactly one bye per odd round

- **WHEN** the engine produces pairings for an odd number of unpaired participants
- **THEN** exactly one new game is a bye and all other participants are paired in regular games

### Requirement: Deterministic sente assignment

When `settings.considerSente == true`, the engine SHALL assign sente in each new pair to the participant with the smaller color imbalance; ties SHALL be broken deterministically (fewer consecutive same-color games, then lower rating-list position, then participant id). In the first round, the higher-rated participant of the pair SHALL receive sente.

#### Scenario: Color balance drives sente

- **WHEN** a pair consists of a participant with balance +1 and one with balance −1
- **THEN** the participant with balance −1 receives sente

#### Scenario: Deterministic output

- **WHEN** the engine runs twice on the same tournament state
- **THEN** the produced games (pairings, sente, bye) are identical

### Requirement: Swiss simulation guarantees

The pairing engine SHALL satisfy, for simulated multi-round Swiss tournaments with random results and repeated auto-pairing: no participant plays the same opponent twice; no participant receives more than one bye or forfeit skip; every participant is placed in exactly one game per round (regular game or bye); and, when `considerSente` is true, no participant ever exceeds two identical colors in a row or a color balance beyond ±2.

#### Scenario: Full tournament simulation without violations

- **WHEN** a tournament with an arbitrary number of participants (even and odd) is simulated over multiple rounds with random results and auto-pairing each round
- **THEN** none of the above invariants is violated in any round

