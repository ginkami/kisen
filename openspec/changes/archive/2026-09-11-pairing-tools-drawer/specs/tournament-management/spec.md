## ADDED Requirements

### Requirement: Pairing tools drawer availability

The tournament edit page SHALL render the "Pairing assistant" drawer (`PairingToolsDrawer`) and its toggle buttons only when all of the following hold: the tournament status is `ongoing`, the "Pairings" tab is active, and the active round sub-tab inside `PairingsSection` is the round being prepared (`publishedRounds + 1`). The drawer and its toggle buttons SHALL NOT be rendered in any other state. When the availability conditions stop holding while the drawer is open, the drawer SHALL disappear.

#### Scenario: Drawer available while preparing the next round

- **WHEN** an `ongoing` tournament's edit page shows the "Pairings" tab with the round sub-tab `publishedRounds + 1` active
- **THEN** the pairing tools drawer toggle button is displayed

#### Scenario: Drawer unavailable on other rounds

- **WHEN** the active round sub-tab is not `publishedRounds + 1`
- **THEN** neither the drawer nor its toggle buttons are displayed

#### Scenario: Drawer unavailable on other tabs or statuses

- **WHEN** the active tab is not "Pairings", or the tournament status is not `ongoing`
- **THEN** neither the drawer nor its toggle buttons are displayed

### Requirement: Pairing tools drawer toggle buttons

The drawer SHALL be toggled from two places, both showing the `FaPeopleArrows` icon and rendered only when the drawer is available:

1. a sticky tab on the right screen edge (mirroring the admin drawer's sticky tab), visible only while the drawer is closed;
2. a button in the pairings rows header of `PairingsBoard` between the `☗` and `☖` headers, rendered only when the drawer is available, and toggling the drawer in both directions.

The two side drawers SHALL be mutually exclusive: opening the AdminDrawer closes the pairing tools drawer and vice versa.

#### Scenario: Sticky right tab opens the drawer

- **WHEN** the drawer is available and closed
- **THEN** the `FaPeopleArrows` sticky tab is shown on the right edge
- **AND** clicking it opens the drawer and closes the AdminDrawer if it was open

#### Scenario: Header button toggles the drawer

- **WHEN** the drawer is available
- **THEN** the pairings rows header shows the `FaPeopleArrows` button between the `☗` and `☖` headers
- **AND** clicking it toggles the drawer open and closed

#### Scenario: Opening the AdminDrawer closes the assistant

- **WHEN** the pairing tools drawer is open and the user opens the AdminDrawer
- **THEN** the pairing tools drawer closes

### Requirement: Pairing tools drawer panel

The drawer SHALL be a right-side panel styled after the AdminDrawer (fixed, full height, `w-80`, `bg-base-200`, shadowed, slide-in transition) that overlays the page content without pushing it. The header SHALL show the `FaPeopleArrows` icon and the localized title "Панель жеребьёвки" / "Pairing assistant", plus a close button; pressing Escape SHALL close the drawer. The panel content SHALL remain empty in this change (tools are specified separately).

#### Scenario: Drawer content and chrome

- **WHEN** the drawer is open
- **THEN** the header shows `FaPeopleArrows` and "Панель жеребьёвки" (ru) / "Pairing assistant" (en)
- **AND** the close button and the Escape key both close the drawer
- **AND** the panel body is empty
