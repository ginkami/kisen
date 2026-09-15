## MODIFIED Requirements

### Requirement: Generate knockout pairings action

The pairing tools drawer SHALL contain an «Игры плей-офф» (en: «Knockout pairings») card — a daisyUI card with a title, two dropdowns and a generate button:
- a «Размер сетки» (en: «Bracket size») dropdown with power-of-two values from 4 up to the smallest power of two greater than or equal to the participants count; the chosen value SHALL be persisted locally per edited tournament (localStorage) so it survives closing the drawer; an invalid persisted value falls back to the default (the largest option);
- a «Раунд плей-офф» (en: «Knockout round») dropdown with values from 1 to `publishedRounds + 1`, defaulting to `publishedRounds + 1`;
- a «Сформировать пары» (en: «Generate pairings») button with the `BsDiagram2Fill` icon.

Clicking the button SHALL form the knockout round for the round being prepared via the knockout engine for the chosen bracket size and knockout round (`generateKnockoutRoundGames`) and apply all formed games via a single round update (one undo/redo action). When the engine fails (no bracket of the chosen size and round, unpaired count out of bounds for knockout round 1, or manual games conflicting with the bracket), the alert modal «Невозможно составить пары» SHALL be shown and no game modified. The card — both dropdowns and the button — SHALL be disabled under the same Swiss completeness condition as the other drawer actions (any round from 1 to `publishedRounds` with a paired game without a result or a participant without any game), plus while generating; Undo/Redo SHALL stay available.

#### Scenario: Card controls and defaults

- **WHEN** the drawer is opened for a tournament with 17 participants and 2 published rounds
- **THEN** the card shows «Игры плей-офф», the bracket size dropdown offers 4..32 defaulting to 32, and the knockout round dropdown offers 1..3 defaulting to 3

#### Scenario: Bracket size persists per tournament

- **WHEN** the user selects a bracket size, closes and reopens the drawer for the same tournament
- **THEN** the previously selected bracket size is restored

#### Scenario: Card is blocked with the other actions

- **WHEN** an earlier round has a paired game without a result or a participant without any game
- **THEN** the card's dropdowns and button are disabled while Undo/Redo stay available

#### Scenario: Engine failure shows the alert

- **WHEN** the chosen knockout round does not match a bracket of the chosen size
- **THEN** the alert modal «Невозможно составить пары» is shown and no game is modified
