# Proposal: crosstable-opponent-tooltips

## Change ID

crosstable-opponent-tooltips

## Why

The public crosstable shows only terse round cells (`12+`, `3=`, `-`). To understand who an opponent was and how the game went, the user has to cross-reference the players table. Hover affordances with rich opponent cards make the crosstable self-explanatory without leaving the page.

## Goal

Add two hover tooltips to the public «Кросс-таблица» section, both showing compact opponent row cards in the established UI style:

1. Hovering a round result cell shows a card of the opponent in that game.
2. Hovering a participant's family name shows the cards of all their opponents (one per round).

## What Changes

- **CrosstableView** (`src/components/tournament/view/CrosstableView.tsx`):
  - Round cells of paired games get a DaisyUI 5 rich tooltip (`tooltip-content`) containing an opponent row card; bye, forfeit, and empty cells keep their current rendering with no tooltip.
  - The participant name cell gets a rich tooltip listing one opponent card per game with an opponent (rounds in ascending order); forfeit games render a result-only card; byes are omitted.
  - New internal `OpponentCard` component styled after the results table player cells: country flag (with country-name tooltip), rank badge with crown (rank color, title tooltip), «familyName, givenName», captured rating, tournament points in a primary badge, and the hovered player's result in that game as a colored badge (`+` success, `-` error, `=` secondary, `?` base-300).
- **No model changes**: standings points come from the existing `computeStandings` result; per-player game lists are derived in the component.
- **i18n**: no new keys required (reuses existing tooltips inside cards).
- **Spec**: `tournament-crosstable` — ADDED requirement «Opponent hover cards».

## Impact

- **Affected specs:** `tournament-crosstable` (additive).
- **Affected code:** `src/components/tournament/view/CrosstableView.tsx`; new test `src/test/crosstableView.test.tsx`.
