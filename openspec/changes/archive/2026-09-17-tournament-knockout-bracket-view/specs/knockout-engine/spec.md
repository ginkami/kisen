## ADDED Requirements

### Requirement: Bracket view reconstruction

The knockout engine (`buildBracketView`) SHALL reconstruct the visual bracket for a requested bracket size `B` (a power of two ≥ 4) and start round `s` from the published rounds: round `s` SHALL match a canonical knockout round 1 configuration per the «Strict bracket search» requirement — the presence of the canonical pairs is sufficient, the results of round `s` SHALL NOT be required. Every bracket pair of a later round up to `publishedRounds` SHALL contribute its winner when its game has a fixed, non-draw result; a bracket pair whose game is missing or undecided SHALL end the derivation — the returned view stops there, and all subsequent rounds down to the final SHALL be projected as placeholder slots. Games outside the bracket SHALL be ignored. When the reconstruction fails (non-canonical start round, invalid geometry) the engine SHALL return null.

#### Scenario: Played bracket renders with winners

- **WHEN** the published rounds form a canonical bracket for the requested size and start round
- **THEN** `buildBracketView` returns the rounds with known winners for played matches

#### Scenario: Formed but unfinished knockout round renders with placeholders

- **WHEN** only the canonical pairs of the knockout round 1 exist and their results are not recorded yet
- **THEN** `buildBracketView` returns the bracket with the pairs rendered without winners and all subsequent rounds projected as placeholder slots

#### Scenario: History does not form the requested bracket

- **WHEN** the start round is not canonical for the requested size
- **THEN** `buildBracketView` returns null
