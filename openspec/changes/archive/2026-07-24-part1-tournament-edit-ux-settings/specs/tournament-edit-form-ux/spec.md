## ADDED Requirements

### Requirement: Multiple Buchholz cut tie-breaks with configurable cut count

The tie-breaks section of the tournament edit form SHALL allow adding multiple `buchholz_cut` tie-break entries, each with its own `cutCount` value. When `buchholz_cut` is the selected tie-break type in the add control, a numeric input for `cutCount` SHALL be displayed. Other tie-break types SHALL remain unique — only one instance per type SHALL be allowed.

#### Scenario: Adding a Buchholz cut tie-break with a custom cut count

- **WHEN** the user selects `buchholz_cut` from the tie-break type dropdown and enters `2` in the `cutCount` input, then clicks "Add"
- **THEN** a new `buchholz_cut` tie-break with `cutCount: 2` is appended to the tie-breaks list

#### Scenario: Adding multiple Buchholz cut tie-breaks

- **WHEN** the user adds a `buchholz_cut` tie-break with `cutCount: 1` and then adds another `buchholz_cut` tie-break with `cutCount: 2`
- **THEN** both entries appear in the tie-breaks list, displayed as "Buchholz cut (1)" and "Buchholz cut (2)"

#### Scenario: Buchholz cut remains available after being added

- **WHEN** the user adds a `buchholz_cut` tie-break
- **THEN** `buchholz_cut` remains in the available types dropdown for further additions

#### Scenario: Non-cut tie-break types are unique

- **WHEN** the user adds a `buchholz` tie-break and it is already in the list
- **THEN** `buchholz` is removed from the available types dropdown and cannot be added again

#### Scenario: Cut count input is hidden for non-cut types

- **WHEN** the selected tie-break type is anything other than `buchholz_cut`
- **THEN** the `cutCount` numeric input is not displayed

### Requirement: New tournament drafts default to byoyomi time control

When `TournamentService.createDraft` creates a new tournament draft, the `settings.timeControl` SHALL be initialized to a `byoyomi` time control with `mainTime: 0`, `byoyomiTime: 0`, and `byoyomiPeriods: 1`.

#### Scenario: Creating a new tournament draft

- **WHEN** a new tournament draft is created via `TournamentService.createDraft`
- **THEN** the resulting tournament's `settings.timeControl.type` is `byoyomi`
- **AND** `byoyomiTime` is `0`
- **AND** `byoyomiPeriods` is `1`

### Requirement: New tournament drafts default to standard tie-break sequence

When `TournamentService.createDraft` creates a new tournament draft, the `settings.tieBreaks` SHALL be initialized to `[{ type: 'points' }, { type: 'buchholz' }, { type: 'sonneborn_berger' }]`.

#### Scenario: Creating a new tournament draft

- **WHEN** a new tournament draft is created via `TournamentService.createDraft`
- **THEN** the resulting tournament's `settings.tieBreaks` contains exactly three entries
- **AND** the first entry has `type: 'points'`
- **AND** the second entry has `type: 'buchholz'`
- **AND** the third entry has `type: 'sonneborn_berger'`