## Why

The participants tab is missing two pieces of business logic: (1) participant names are not validated — a tournament can be saved/published with empty familyName and givenName in all locales; (2) regular users (`role: 'user'`) see player-linking controls (search popover, autocomplete, edit modal) that they cannot use because they lack permission to read/modify the global player database.

## What Changes

- **Validation**: participant `familyName` and `givenName` SHALL be marked as required (`*`). The tournament publish validation SHALL block when any participant lacks at least one locale with both `familyName` and `givenName` filled.
- **Role-based UI hiding**: player-linking controls (link button, unlink button, edit modal, familyName autocomplete popover) SHALL be visible only to users with `role === 'admin'` or `role === 'manager'`. For regular users, `participant.player` SHALL remain `null`, the entire player-link row SHALL be hidden, and the familyName autocomplete popover SHALL not appear.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `tournament-edit-form-ux`: participant names are now validated on publish; player-linking UI is role-gated.

## Impact

- **Code**: `src/components/tournament/ParticipantRow.tsx`, `src/components/tournament/ParticipantsSection.tsx`, `src/hooks/useTournamentForm.ts`, `src/components/tournament/TournamentEditForm.tsx`.
- **APIs/Dependencies**: none.
- **i18n**: no new keys (existing `common.fieldRequired` reused).