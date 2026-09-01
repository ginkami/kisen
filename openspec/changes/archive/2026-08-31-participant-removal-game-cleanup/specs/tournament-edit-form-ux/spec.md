# Delta spec: tournament-edit-form-ux

## MODIFIED Requirements

### Requirement: Participant card row management

Each participant card SHALL be rendered in a row with an add button (`BsPlus`, tooltip "Добавить участника" / "Add participant") and a remove button (`BsX`, tooltip "Удалить участника" / "Remove participant") on the right, mirroring the Schedule section pattern. The add button SHALL insert a new empty participant card directly below the current card. The remove button SHALL require a confirmation modal before removing the card. Removing a participant SHALL also remove that participant's games from the draft per the participant-removal game cleanup rule of the `tournament-management` capability.

#### Scenario: Adding a participant below an existing card

- **WHEN** the user clicks the add button on participant card N
- **THEN** a new empty participant card is inserted at position N+1

#### Scenario: Removing a participant requires confirmation

- **WHEN** the user clicks the remove button on a participant card
- **THEN** a confirmation modal is displayed
- **AND** the participant is removed only after the user confirms

#### Scenario: Cancelling participant removal

- **WHEN** the removal confirmation modal is open and the user cancels
- **THEN** the participant card remains unchanged

#### Scenario: Removing a participant removes their games

- **WHEN** the user confirms removal of a participant who has lone forfeit games in past rounds and a pairing in the round being prepared
- **THEN** the participant's lone games and unpublished pairing are removed from the draft
- **AND** the participant's paired games in published rounds remain unchanged

### Requirement: Participants section in tournament edit form

The Participants tab of the tournament edit form SHALL render a `ParticipantsSection` with a header titled "Участники турнира" / "Tournament participants" and a locale switcher (`LocaleTabs`) controlling the locale of localized participant fields. The section SHALL list all tournament participants as editable cards. Each card SHALL expose the fields: familyName, givenName (active locale), ratingValue, rank, nationality, location, residence, and title. `startingPoints` SHALL be set to 0 and SHALL NOT be editable on this tab. On save, participant rows without a name in any locale SHALL be dropped, and the games of such dropped rows' ids SHALL be dropped with them per the participant-removal game cleanup rule of the `tournament-management` capability.

#### Scenario: Rendering the Participants tab

- **WHEN** the user opens the Participants tab of the tournament edit form
- **THEN** the section renders with the header "Участники турнира" / "Tournament participants"
- **AND** a `LocaleTabs` switcher controls localized fields of all participant cards
- **AND** existing tournament participants are displayed as cards

#### Scenario: Empty participants list shows one empty card

- **WHEN** the tournament has no participants
- **THEN** the section displays a single empty participant card ready for input

#### Scenario: Editing a localized participant field

- **WHEN** the user changes the familyName of a participant while the `ru` locale is active
- **THEN** only the `ru` locale value of that participant's familyName changes
- **AND** the `en` locale value remains unchanged

#### Scenario: Starting points are not editable on this tab

- **WHEN** a participant is created via this tab
- **THEN** the participant's `startingPoints` SHALL be 0
- **AND** no UI control for `startingPoints` SHALL be displayed

#### Scenario: Saving with a nameless row drops the row and its games

- **WHEN** the user saves a tournament where a participant card was left without familyName and givenName but the card's row id has auto-generated lone games in the draft
- **THEN** the row is not persisted as a participant
- **AND** the lone games of that row's id are not persisted in `games`
