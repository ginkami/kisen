## Context

The tournament editor (`TournamentEditForm`) uses four tabs: General, Settings, Schedule, and Participants. Right now all editable sections (Basic Information, Binding, Time Control, Tie-breaks, Schedule) are rendered under the General tab, while Settings and Schedule tabs show a placeholder. The Participants tab is intentionally empty. This design moves the sections to their semantically correct tabs and gives the Time Control section its own localized title.

## Goals / Non-Goals

**Goals:**
- Render Time Control and Tie-breaks under the Settings tab.
- Render Schedule under the Schedule tab.
- Keep Basic Information and Binding under the General tab.
- Rename the Time Control card title from the generic "Settings" to "Time control".
- Add localized strings for the new title in both `ru` and `en`.

**Non-Goals:**
- No changes to data models, validation rules, or persistence.
- No changes to the Participants tab placeholder.
- No new sections or fields are added.

## Decisions

- **Keep section components unchanged** (`TimeControlSection`, `TieBreaksSection`, `ScheduleSection`). Only their placement inside `TournamentEditForm` changes. This minimizes churn and preserves existing behavior and tests.
- **Introduce a dedicated i18n key** `tournament.edit.timeControl.title` instead of reusing `tournament.edit.settings`, because "Settings" is now only the tab label and the card needs a more specific heading.
- **No new route or query parameter logic**. The active tab state stays a local React state variable; default tab remains "General".

## Risks / Trade-offs

- **[Risk]** Users used to seeing Time Control on the General tab may need to relearn the layout.
  - **Mitigation**: The tabs are clearly labeled and the move aligns each section with its logical tab name.
- **[Risk]** If the Settings or Schedule tabs later gain more sections, their render blocks may grow.
  - **Mitigation**: Each tab can be extracted into a small sub-component when it becomes larger; for now inline rendering keeps the change minimal.

## Migration Plan

No data or deployment migration is required. The change is purely presentational and takes effect on the next application deploy.

## Open Questions

None.
