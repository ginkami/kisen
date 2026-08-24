## MODIFIED Requirements

### Requirement: Tournament basic information

The tournament entity SHALL represent the organizing country as a required ISO 3166-1 alpha-2 code. The tournament entity SHALL NOT contain an online/offline flag. The tournament entity SHALL represent the chief arbiter as a single optional localized name object. The tournament entity SHALL hold a `regulations` array of regulation id references (UUIDv7, default empty): old tournament documents without the field parse with an empty array; updates persist the array through `UpdateTournamentInput.regulations`; the edit form round-trips it with dirty tracking.

#### Scenario: Creating a draft tournament
- **WHEN** a user creates a new tournament draft
- **THEN** the system pre-fills `country` and `locales.*.location` from the user's IP address
- **AND** the draft document contains no `isOnline` field
- **AND** the draft document contains an optional `arbiter` field with localized `familyName` and `givenName`
- **AND** the draft document contains `regulations: []`

#### Scenario: Publishing a tournament
- **WHEN** a user publishes a tournament
- **THEN** the system rejects the publish action unless `country` is a valid 2-letter code
- **AND** the system rejects the publish action unless every locale has a non-empty `location`

#### Scenario: Existing tournament without the regulations field

- **WHEN** a tournament document created before this change (no `regulations` field) is loaded
- **THEN** it parses with `regulations` equal to an empty array

#### Scenario: Saving selected regulations

- **WHEN** the user adds regulations in the edit form and saves
- **THEN** the persisted tournament contains the selected regulation ids in `regulations` in selection order

## ADDED Requirements

### Requirement: Regulations picker in tournament general info

The general info section of the tournament edit form SHALL provide, below the description `ExpandableField`: a «+ Регламент» button visually styled like `ExpandableField` (ghost button with the `BsPlus` icon); when the tournament has no selected regulations, this button SHALL be the only element shown. When at least one regulation is selected, a «Регламенты» label SHALL appear above the button, followed by one removable outline badge per selected regulation (localized title + × button removing the id). Clicking the button SHALL open a `RegulationPickerModal` listing, in a scrollable area, only regulations the current user can edit (`listEditable`: created by the user, affiliated with associations the user manages, or all for admins) excluding already-selected ones; picking a regulation closes the modal and adds its badge next to the others. Badge titles resolve from the same loaded list; a saved regulation missing from the list SHALL render an «untitled» placeholder badge.

#### Scenario: No regulations selected

- **WHEN** the tournament has no regulations and the user opens the general info tab
- **THEN** only the «+ Регламент» button is rendered below the description field

#### Scenario: Selected regulations render as removable badges

- **WHEN** the tournament has two selected regulations
- **THEN** the «Регламенты» label renders with two outline badges showing localized titles, each with a working × removal button, above the «+ Регламент» button

#### Scenario: Picker lists only unselected editable regulations

- **WHEN** the user opens the picker and one of their editable regulations is already selected
- **THEN** the modal list excludes that regulation and shows the remaining editable ones

#### Scenario: Adding a regulation from the picker

- **WHEN** the user picks a regulation in the modal
- **THEN** the modal closes and a badge for the picked regulation appears next to the existing badges