## MODIFIED Requirements

### Requirement: Strict bracket search for a given bracket size and knockout round

The knockout engine (`generateKnockoutRoundGames`) SHALL form the knockout round for the round being prepared (`publishedRounds + 1`) for a bracket size `B` (a power of two ≥ 4) and a knockout round `K` (`1 ≤ K ≤ publishedRounds + 1`) chosen by the user. For `K > 1` the engine SHALL search for a bracket deterministically: the bracket starts at round `s = publishedRounds + 2 − K`. The bracket MAY be embedded in rounds that also contain arbitrary other games (a Swiss round, consolation or forfeit games of players outside the bracket): only the bracket's own games are constrained. In round `s` a configuration of the round's bye games and paired games SHALL be found such that the covered players (`B − byeCount`) form the canonical knockout round 1 — strict seeding (1 vs last, 2 vs second-last, …) by points before round `s` (then rating), padded to `B` with bottom virtual seeds, byes to the top `byeCount` seeds; configurations using more of the round's games are preferred. In every later round `r` up to `publishedRounds` each bracket pair (winners of adjacent bracket slots of round `r−1`) SHALL have a game with a fixed, non-draw result. All games of a round that do not belong to the bracket — including games between already eliminated players — SHALL be ignored and SHALL NOT constrain the search. If no such bracket exists the engine SHALL fail with a pairing error.

#### Scenario: Bracket of the chosen size and round is found

- **WHEN** the played rounds contain a bracket of the chosen size whose knockout round `K` lands on the round being prepared
- **THEN** the engine forms the pairs of that knockout round per the bracket tree

#### Scenario: Eliminated players without forfeit games do not break the search

- **WHEN** a bracket exists but eliminated players have no games (or arbitrary games, including games between eliminated players) in the following rounds
- **THEN** the bracket is still found and continued

#### Scenario: Bracket embedded in a Swiss round is recognized

- **WHEN** the bracket's start round also contains Swiss games, extra byes or forfeits of players outside the bracket, and the bracket's own bye games and pairs form the canonical round 1 of the chosen size
- **THEN** the bracket is found and continued despite the unrelated games

#### Scenario: No bracket of the given size and round

- **WHEN** round `s = publishedRounds + 2 − K` is not a canonical seeding round of the chosen bracket size, or a later round does not follow the bracket adjacency
- **THEN** the engine fails with a pairing error

### Requirement: Knockout round 1 from unpaired players

When the chosen knockout round is 1, the engine SHALL start the bracket at the round being prepared from the players not placed in any game of that round: they SHALL be sorted by points after the published rounds (first criterion) and rating (second criterion), padded abstractly to the chosen bracket size with bottom virtual seeds, and paired by strict seeding (1 vs last, 2 vs second-last, …). A real player drawn against a virtual seed SHALL receive a bye (`status: 'bye'`, `result: 'player1_won'`), so byes always go to top seeds. Manual games of the round SHALL be kept unchanged (their players are excluded from the seeding). If the number of unpaired players is less than half the bracket size or greater than the bracket size, the engine SHALL fail with a pairing error.

#### Scenario: Six unpaired players in an 8-bracket

- **WHEN** knockout round 1 is generated with bracket size 8 for 6 unpaired players
- **THEN** the pairs are seed 3 vs 6 and seed 4 vs 5, and seeds 1 and 2 receive byes

#### Scenario: Too few unpaired players for the bracket size

- **WHEN** the number of unpaired players is less than half the chosen bracket size
- **THEN** the engine fails with a pairing error

#### Scenario: Manual games are kept

- **WHEN** the round contains manual paired games
- **THEN** they are kept and the unpaired players are seeded canonically into the remaining bracket slots

### Requirement: Bracket continuation

For a chosen knockout round `K > 1` the engine SHALL form the pairs of the round being prepared from the bracket tree: winners of adjacent bracket slots of knockout round `K − 1`. A manual paired game of the round that already forms a planned pair SHALL be kept; a manual game that conflicts with the bracket (a bracket player placed in another game, a bye or a forfeit) SHALL fail with a pairing error. Manual games of players outside the bracket SHALL be kept unchanged.

#### Scenario: Winners meet per the bracket

- **WHEN** the previous knockout round results are fixed
- **THEN** the round being prepared pairs the winners of adjacent bracket slots

#### Scenario: Conflicting manual game fails

- **WHEN** a bracket player is placed in a manual game other than the planned pair
- **THEN** the engine fails with a pairing error

### Requirement: Single-action application

The knockout generation result SHALL be applied via a single round update (one undo/redo history action). Only the pairs (and byes in knockout round 1) of the chosen knockout round SHALL be created — the engine SHALL NOT create forfeit games for eliminated players; eliminated players remain unpaired.

#### Scenario: One history action per knockout generation

- **WHEN** the user generates knockout pairings for the round being prepared
- **THEN** all formed games are applied via one round update

#### Scenario: Eliminated players get no games from the engine

- **WHEN** a knockout round is generated for a bracket with previously eliminated players
- **THEN** the eliminated players receive no games (they stay unpaired)

## REMOVED Requirements

- ### Requirement: Final-round label computation

**Reason:** the «1/{n} финала» label is replaced by the explicit bracket size and knockout round dropdowns of the «Игры плей-офф» card.

**Migration:** the card's button label is static («Сформировать пары»); the round semantics are expressed by the «Раунд плей-офф» dropdown.
