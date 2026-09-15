## MODIFIED Requirements

### Requirement: Pairing tools drawer availability

The tournament edit page SHALL render the "Pairing assistant" drawer (`PairingToolsDrawer`) and its toggle buttons only when all of the following hold: the tournament status is `ongoing`, the "Pairings" tab OR the "Crosstable" tab is active, and the form state is loaded. On the "Pairings" tab the drawer and its toggle buttons SHALL be available for every active round sub-tab (not only the round being prepared); on the "Crosstable" tab only the side sticky `FaPeopleArrows` tab SHALL be shown. The drawer and its toggle buttons SHALL NOT be rendered in any other state. When the availability conditions stop holding while the drawer is open, the drawer SHALL disappear. The sticky `FaPeopleArrows` tab SHALL show the tooltip «Открыть панель жеребьёвки».

#### Scenario: Drawer available on any round sub-tab of the pairings tab

- **WHEN** an `ongoing` tournament's edit page shows the "Pairings" tab with any round sub-tab active
- **THEN** the pairing tools drawer toggle buttons are displayed

#### Scenario: Crosstable tab shows only the sticky tab

- **WHEN** an `ongoing` tournament's edit page shows the "Crosstable" tab and the drawer is closed
- **THEN** only the side sticky `FaPeopleArrows` tab is displayed, with the tooltip «Открыть панель жеребьёвки»
- **AND** no pairings-board header toggle is rendered

#### Scenario: Drawer unavailable on other tabs or statuses

- **WHEN** the active tab is neither "Pairings" nor "Crosstable", or the tournament status is not `ongoing`
- **THEN** neither the drawer nor its toggle buttons are displayed

### Requirement: Pairing tools undo/redo

The pairing tools drawer SHALL show, in one row at the top of the panel, two buttons implementing Undo/Redo of the tournament's games-state changes:

1. an undo button with the `BsArrowCounterclockwise` icon and tooltip «Отменить изменение состояния игр турнира»;
2. a redo button with the `BsArrowClockwise` icon and tooltip «Вернуть изменение состояния игр турнира».

Each button SHALL be disabled when no saved state exists for it to apply. A history state is a pairing-relevant snapshot `{ games, publishedRounds, participants }` persisted locally in IndexedDB keyed by the tournament, so the history survives a page reload. Every games change in any round (pairs, results, forfeits, byes), every `publishedRounds` change (publish/un-publish), and every participant-composition, `player`-link, or starting-points change SHALL push a history state; pushing a new state after undo SHALL discard the redo tail. Internal participant attribute changes (rating, names, and similar) SHALL NOT create history states and SHALL NOT be reverted by undo/redo. The history SHALL be capped (50 entries) and SHALL NOT be cleared when `publishedRounds` changes. When an undo/redo restores a snapshot whose `publishedRounds` differs from the current value, the tournament SHALL be saved automatically.

#### Scenario: Undo restores the previous games state

- **WHEN** the user changes games (e.g. runs auto-pairing or fixes a result) and then clicks the undo button
- **THEN** the tournament's games revert to the state before the change

#### Scenario: Undo/Redo of a publishedRounds change auto-saves

- **WHEN** an undo or redo restores a snapshot whose `publishedRounds` differs from the current value
- **THEN** the games and `publishedRounds` are restored
- **AND** the tournament is saved automatically

#### Scenario: Participant composition is part of history

- **WHEN** the user adds or removes a participant, relinks a player, or changes starting points, and then clicks the undo button
- **THEN** the participant composition, `player` links, and starting points revert to the previous state
- **AND** internal participant attributes edited afterwards (rating, names) are not reverted

#### Scenario: Internal participant edits are not recorded

- **WHEN** the user edits only a participant's rating or name
- **THEN** no history state is pushed and the undo/redo buttons stay unchanged

#### Scenario: Buttons disabled without history

- **WHEN** no applicable saved state exists
- **THEN** the undo and redo buttons are disabled

#### Scenario: New action discards redo

- **WHEN** the user undoes an action and then makes any new recorded change
- **THEN** the redo tail is discarded and the redo button becomes disabled

#### Scenario: History survives round publishing

- **WHEN** a round is published or un-published
- **THEN** the history is kept (the publish/un-publish change itself is recorded as a state)


### Requirement: Generate pairings action

The pairing tools drawer SHALL show a "Сформировать пары" button with the square Swiss flag icon (`CH` from `country-flag-icons/react/1x1`) below the undo/redo row.
 Clicking it SHALL run the automatic pairing engine for all participants of the round being prepared that do not yet have a game, and apply the resulting games via a single round update (one undo/redo action). Existing manual pairs, results, and carried-over forfeits in the round SHALL remain untouched. The button SHALL be disabled while any round from 1 to `publishedRounds` contains a paired game (two players) without a result, or a participant without a game in that round (no opponent, no bye, no forfeit). Lone games (bye/forfeit, `player2 == null`) do not await a result and SHALL NOT block the action. Undo/Redo buttons SHALL NOT be affected by this condition.

#### Scenario: Auto-pairing fills the board

- **WHEN** the user clicks "Сформировать пары" with unpaired participants in the round being prepared
- **THEN** new games appear for all previously unpaired participants (regular games, plus a bye when the count is odd)

#### Scenario: Disabled while earlier rounds are incomplete

- **WHEN** a round from 1 to `publishedRounds` has a paired game without a result or a participant without a game
- **THEN** the "Сформировать пары" button is disabled
- **AND** the undo/redo buttons stay enabled

#### Scenario: Lone game without a result does not block

- **WHEN** a round from 1 to `publishedRounds` contains only completed paired games and a bye/forfeit game without a result
- **THEN** the "Сформировать пары" button stays enabled

#### Scenario: Pairing failure alert

- **WHEN** the engine cannot produce a full valid pairing
- **THEN** an alert modal with the message «Невозможно составить пары» is shown
- **AND** no game in the round is modified

### Requirement: Clear round pairings action

The pairing tools drawer SHALL show a "Отменить пары" button at the bottom of the panel. Clicking it SHALL open a confirm modal (variant `error`) with the message «Все пары {n}-го тура будут расформированы» (where {n} is the round number); confirming SHALL remove all games of the round via a single round update (one undo/redo action); cancelling SHALL leave the round unchanged. The button SHALL be disabled under the same condition as the "Сформировать пары" button (any round from 1 to `publishedRounds` with a paired game without a result or a participant without a game; lone games do not block); Undo/Redo buttons SHALL NOT be affected.

#### Scenario: Confirm clears the round

- **WHEN** the user confirms the clear action
- **THEN** all games of the round being prepared are removed

#### Scenario: Cancel keeps the round

- **WHEN** the user cancels the clear action
- **THEN** the round's games are unchanged

#### Scenario: Disabled while earlier rounds are incomplete

- **WHEN** a round from 1 to `publishedRounds` has a paired game without a result or a participant without a game
- **THEN** the "Отменить пары" button is disabled
