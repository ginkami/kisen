## Why

The tournament edit form's "Participants" tab is currently a placeholder. Tournament organizers cannot add, edit, or remove participants within the tournament form, despite the `participants` array already existing in the domain model. Operators also need to link participants to players in the global player database (autocomplete by family name, search via popover, edit linked players in place) to keep tournament data in sync with the shared player registry.

## What Changes

- **Tournament form**: the Participants tab renders a full `ParticipantsSection` with locale switcher and a list of editable participant cards (add/remove/update via `useTournamentForm`).
- **Participant card fields**: familyName, givenName (active locale), ratingValue, rank, nationality, location, residence, title. `startingPoints` defaults to 0 and is not edited here.
- **Row management**: add-below (`BsPlus`) and remove (`BsX` with tooltip) buttons mirroring the Schedule section; removal requires a custom confirm modal.
- **Player linking** (when `participant.player` is set): button with flag + "FamilyName, GivenName" opens a `PlayerEditModal` wrapping `PlayerInfoSection`; on save → confirm "overwrite participant card from player?"; unlink button (`BsFillPersonXFill`) → confirm → clears `participant.player`.
- **Player linking** (when not set): `BsFillPersonPlusFill` button opens a search popover (reusable `PlayerSearchPanel` extracted from `AdminDrawer`); selecting a player → link + confirm "overwrite participant card from player?".
- **Autocomplete on familyName field**: while typing, a popover (no title, no search input) shows matching players; selecting one → link + auto-fill participant fields **without** confirm.
- **Shared form helpers**: extract `playerToFormState`, `formStateToUpdateInput`, `validatePlayerForm` from `usePlayerForm` into `src/hooks/playerFormHelpers.ts` so the new `PlayerEditModal` reuses them without duplicating logic.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `tournament-edit-form-ux`: the Participants tab SHALL provide full participant CRUD with locale-aware card fields and player-database integration (link, unlink, edit, autocomplete).

## Impact

- **Code**:
  - New: `src/components/tournament/ParticipantsSection.tsx`, `src/components/tournament/ParticipantRow.tsx`, `src/components/player/PlayerSearchPanel.tsx`, `src/components/player/PlayerEditModal.tsx`, `src/hooks/playerFormHelpers.ts`.
  - Modified: `src/components/tournament/TournamentEditForm.tsx` (render ParticipantsSection), `src/hooks/useTournamentForm.ts` (participants state + CRUD + save mapping), `src/components/AdminDrawer.tsx` (use PlayerSearchPanel), `src/hooks/usePlayerForm.ts` (import shared helpers).
- **Domain**: `participantSchema` already updated (separate prior change) to include `title`, `location`, `residence`.
- **i18n**: new translation keys under `tournament.edit.participants` in both `ru` and `en`.
- **Dependencies**: no new runtime dependencies. Popover/combobox implemented with the same self-hosted pattern as `ScheduleEventCombobox` (no radix-ui).
- **APIs/Security**: no Firestore rules or service-signature changes; participants persist as part of the existing tournament document.