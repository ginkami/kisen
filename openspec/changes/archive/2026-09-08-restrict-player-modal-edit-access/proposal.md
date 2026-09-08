## Why

The `restrict-player-edit-access` change gated the admin drawer search and the `/players/:id/edit` page, but a third entry point remains: the `PlayerEditModal` opened from the "edit player" button of a tournament participant row (`ParticipantRow`, visible to admins and managers). Managers can open this modal for any linked participant and hit a failed save — the same dead-end that was already eliminated elsewhere.

## What Changes

- Extract the existing page guard logic into a shared hook `usePlayerEditAccess(player)` (`src/hooks/usePlayerAccess.ts`) returning `{ isChecking, allowed }`, and refactor `PlayerEditForm` to use it (behavior unchanged).
- Guard `PlayerEditModal`: while the player or the user's managed associations are loading, show the spinner; if the loaded player is not editable by the current user (per `canEditPlayer`), show a localized access-denied alert without any save control — only Cancel/Close remains.
- No changes to player linking itself: linking any player as a participant stays allowed (it modifies the tournament document, not the player), and the search panels in participant rows are not filtered.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `player-edit-access`: add a requirement that the participant-row player edit modal blocks editing of players the current user may not edit, mirroring the page guard.

## Impact

- `src/hooks/usePlayerAccess.ts` (new shared hook), `src/components/player/PlayerEditForm.tsx` (refactor to the hook), `src/components/player/PlayerEditModal.tsx` (guard).
- No locale changes — the existing `player.edit.errors.noAccess` key is reused.
- No backend, Firestore rules, or index changes.