# Delta spec: tournament-crosstable

## ADDED Requirements

### Requirement: Opponent hover cards

The «Кросс-таблица» section SHALL show rich hover tooltips with compact opponent row cards. An opponent card SHALL render, left to right: the opponent's country flag with a tooltip showing the country name in the current UI locale, the rank badge colorized per the crosstable color scale with a crown icon showing the title tooltip when the opponent has one, the opponent name as «familyName, givenName» picked for the current locale with fallback to `ru` then `en`, the opponent's captured rating value, the opponent's tournament points in a primary badge, and the hovered player's result in that game as a badge — `+` on success, `-` on error, `=` on secondary, `?` on base-300. When there is no opponent, the card SHALL render only the result badge. Hovering the result cell of a paired game SHALL show a tooltip with the card of the opponent in that game; bye cells, forfeit cells, and cells without a game SHALL show no tooltip. Hovering a participant's family name SHALL show a tooltip with one card per game of that participant that has an opponent, in ascending round order; forfeit games SHALL render result-only cards, byes SHALL be omitted; if no such games exist, no tooltip SHALL be shown.

#### Scenario: Result cell tooltip shows the opponent card

- **WHEN** the user hovers the round-2 result cell of a paired game between participants A and B
- **THEN** a tooltip appears showing B's card: flag, rank badge with crown when titled, name, rating, tournament points in a primary badge, and a `+` success badge when A won that game

#### Scenario: No tooltip on bye, forfeit, or empty cells

- **WHEN** the user hovers a bye cell, a forfeit cell, or a cell without a game
- **THEN** the cell renders as before and no tooltip appears

#### Scenario: Result badge colors

- **WHEN** the hovered player's result in a game is, respectively, a win, a loss, a draw, or not yet set
- **THEN** the card's result badge renders `+` with the success color, `-` with the error color, `=` with the secondary color, or `?` with the base-300 background

#### Scenario: Name tooltip lists all opponents

- **WHEN** the user hovers the family name of a participant who played opponents in rounds 1 and 3 and received a forfeit in round 2
- **THEN** a tooltip appears with, in order: the round-1 opponent's card, a result-only card with `-` for the round-2 forfeit, and the round-3 opponent's card

#### Scenario: Name tooltip omitted without opponents

- **WHEN** the user hovers the family name of a participant with no games against opponents
- **THEN** no tooltip appears
