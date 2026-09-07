## Purpose

The tabbed layout of the tournament editor: the set of editor tabs and the content area each tab renders.

## Requirements

### Requirement: Tournament editor tabs have defined content areas
The tournament editor SHALL display section content under the tab that matches the section's purpose.

#### Scenario: General tab shows basic and binding information
- **WHEN** the user opens the tournament editor on the "General" tab
- **THEN** the editor displays the Basic Information section and the Binding section
- **AND** it does NOT display Time Control, Tie-breaks, or Schedule sections

#### Scenario: Settings tab shows time control and tie-breaks
- **WHEN** the user selects the "Settings" tab
- **THEN** the editor displays the Time Control section and the Tie-breaks section
- **AND** the Time Control section heading reads "Контроль времени" in Russian and "Time control" in English

#### Scenario: Schedule tab shows schedule
- **WHEN** the user selects the "Schedule" tab
- **THEN** the editor displays the Schedule (rounds) section
- **AND** it does NOT display a placeholder message

#### Scenario: Participants tab remains a placeholder
- **WHEN** the user selects the "Participants" tab
- **THEN** the editor displays a placeholder indicating the section is empty
