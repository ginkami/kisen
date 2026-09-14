## ADDED Requirements

### Requirement: Pairing tools undo/redo

The pairing tools drawer SHALL show, in one row at the top of the panel, two buttons implementing Undo/Redo of pairing actions for the round being prepared (`publishedRounds + 1`):

1. an undo button with the `BsArrowCounterclockwise` icon and tooltip «Отменить действие по подбору пар»;
2. a redo button with the `BsArrowClockwise` icon and tooltip «Вернуть действие по подбору пар».

Each button SHALL be disabled when no saved state exists for it to apply. The states (the round's games, including pairings and results) SHALL be persisted locally in IndexedDB keyed by tournament and round, so the history survives a page reload. Every change of the round's games (the auto-pairing result counts as one action; each manual board edit or result change counts as one action) SHALL push a history state; pushing a new state after undo SHALL discard the redo tail. The saved states SHALL be cleared whenever `publishedRounds` changes (a round is published or un-published).

#### Scenario: Undo restores the previous round state

- **WHEN** the user runs auto-pairing and then clicks the undo button
- **THEN** the round's games revert to the state before the auto-pairing

#### Scenario: Redo reapplies an undone action

- **WHEN** the user undoes an action and then clicks the redo button
- **THEN** the undone round state is restored

#### Scenario: Buttons disabled without history

- **WHEN** no action has been recorded yet for the round
- **THEN** both undo and redo buttons are disabled

#### Scenario: History cleared on round change

- **WHEN** a round is published or un-published (`publishedRounds` changes)
- **THEN** the locally stored pairing history for the tournament is cleared

#### Scenario: New action discards redo

- **WHEN** the user undoes an action and then makes any new change to the round's games
- **THEN** the redo tail is discarded and the redo button becomes disabled

### Requirement: Generate pairings action

The pairing tools drawer SHALL show a "Сформировать пары" button with the `CgSwiss` icon below the undo/redo row. Clicking it SHALL run the automatic pairing engine for all participants of the round that do not yet have a game, and apply the resulting games via a single round update (one undo/redo action). Existing manual pairs, results, and carried-over forfeits in the round SHALL remain untouched.

#### Scenario: Auto-pairing fills the board

- **WHEN** the user clicks "Сформировать пары" with unpaired participants in the round
- **THEN** new games appear for all previously unpaired participants (regular games, plus a bye when the count is odd)

#### Scenario: Pairing failure alert

- **WHEN** the engine cannot produce a full valid pairing
- **THEN** an alert modal with the message «Невозможно составить пары» is shown
- **AND** no game in the round is modified

### Requirement: Clear round pairings action

The pairing tools drawer SHALL show a "Отменить пары" button at the bottom of the panel. Clicking it SHALL open a confirm modal (variant `error`) with the message «Все пары {n}-го тура будут расформированы» (where {n} is the round number); confirming SHALL remove all games of the round via a single round update (one undo/redo action); cancelling SHALL leave the round unchanged.

#### Scenario: Confirm clears the round

- **WHEN** the user confirms the clear action
- **THEN** all games of the active round are removed

#### Scenario: Cancel keeps the round

- **WHEN** the user cancels the clear action
- **THEN** the round's games are unchanged
