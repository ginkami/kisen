## ADDED Requirements

### Requirement: Generate knockout pairings action

The pairing tools drawer SHALL show a "Сформировать пары 1/{{n}} финала" button with the `BsDiagram2Fill` icon below the Swiss "Сформировать пары" button, where `n` is computed per the `knockout-engine` capability (pairs + byes of the formed round). Clicking it SHALL generate the knockout round for the round being prepared via the knockout engine — continuing an existing strict bracket, or starting canonical knockout round 1 seeded by points (then rating) with bottom virtual padding (byes to top seeds) — and apply all formed games (pairs, byes, forfeit games for eliminated players) via a single round update (one undo/redo action). The button SHALL be disabled under the same Swiss completeness condition as the other actions (any round from 1 to `publishedRounds` with a paired game without a result or a participant without a game), plus while generating. The label fragment «1/{n} финала» SHALL be computed from the tournament state without the round's own games, so it SHALL remain unchanged for the current round once computed; when n = 1 the label SHALL read «Сформировать пары финала». When the manual pre-pairing makes the canonical knockout impossible, the alert modal «Невозможно составить пары» SHALL be shown and no game modified.

#### Scenario: Knockout round 1 for six players

- **WHEN** no bracket exists, no manual games are present, and there are 6 participants
- **THEN** the button label shows «Сформировать пары 1/4 финала»
- **AND** clicking it creates 2 paired games (strict seeding 3 vs 6, 4 vs 5) and 2 byes for the top seeds

#### Scenario: Bracket continuation

- **WHEN** the published rounds form a strict bracket and the current round's manual games do not break it
- **THEN** clicking the button creates the bracket's next-round pairs and forfeit games for eliminated players

#### Scenario: Not blocked by Swiss completeness

- **WHEN** a published round has a paired game without a result but the knockout button is clicked
- **THEN** the knockout generation is not blocked by the Swiss completeness condition (the Swiss buttons stay governed by it)
