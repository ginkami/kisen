## Why

The tournament editor currently places Time Control, Tie-breaks, and Schedule sections under the General tab, which makes the tab crowded and the dedicated Settings and Schedule tabs empty placeholders. Reorganizing these sections into their logical tabs improves navigation clarity and prepares each tab for future features.

## What Changes

- Rename the Time Control card title from "Settings" to "Time control" and use a dedicated i18n key.
- Move the Time Control and Tie-breaks sections from the General tab to the Settings tab.
- Move the Schedule section from the General tab to the Schedule tab.
- Leave the General tab with only Basic Information and Binding (slug/event/association) sections.
- Update both `ru` and `en` locale files with the new section title key.

## Capabilities

### New Capabilities
- `tournament-edit-tabs`: Defines how the tournament editor's tabs (General, Settings, Schedule, Participants) are organized and which sections belong to each tab.

### Modified Capabilities
- No existing spec-level requirements are changing.

## Impact

- `src/components/tournament/TournamentEditForm.tsx`
- `src/locales/ru/translation.json`
- `src/locales/en/translation.json`
