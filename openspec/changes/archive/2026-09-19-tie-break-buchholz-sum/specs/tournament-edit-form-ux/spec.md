## MODIFIED Requirements

### Requirement: New tournament drafts default to standard tie-break sequence

When `TournamentService.createDraft` creates a new tournament draft, the `settings.tieBreaks` SHALL be initialized to `[{ type: 'points' }, { type: 'buchholz' }, { type: 'sonneborn_berger' }, { type: 'buchholz_sum' }]`.

#### Scenario: Creating a new tournament draft

- **WHEN** a new tournament draft is created via `TournamentService.createDraft`
- **THEN** the resulting tournament's `settings.tieBreaks` contains exactly four entries
- **AND** the first entry has `type: 'points'`
- **AND** the second entry has `type: 'buchholz'`
- **AND** the third entry has `type: 'sonneborn_berger'`
- **AND** the fourth entry has `type: 'buchholz_sum'`
