## Context

The `player-edit-access` capability already defines the client-side editability rule (`canEditPlayer`) and applies it in two places: the admin drawer search filter and the `/players/:id/edit` page guard (`PlayerEditForm`). `PlayerEditModal` (tournament participant rows) loads the full player via `playerService.getById` before rendering the form, so the same verdict can be computed there without extra requests. The page guard currently keeps its auth/associations wiring inline in the component.

## Goals / Non-Goals

- Goals: no more dead-end saves from the participant-row modal; one shared implementation of the guard wiring; keep the modal closable at all times.
- Non-Goals: no filtering of participant linking/search (linking edits the tournament, not the player); no batch-loading of participant player entities to hide the edit button (possible follow-up); no changes to Firestore rules.

## Decisions

### Decision 1: shared `usePlayerEditAccess` hook
New `src/hooks/usePlayerAccess.ts`: wraps `useAuth` (uid, role), `useMyAssociations(uid)`, and `canEditPlayer` into `{ isChecking, allowed }`. `allowed` is `true` when there is no player or no user id (mirrors the current page guard semantics: no verdict without a signed-in uid). `isChecking` is `true` while a player exists and the associations query is in flight. `PlayerEditForm` refactors onto the hook with identical behavior — the existing `playerEditFormAccess.test.tsx` mocks the same underlying modules and must stay green.

### Decision 2: guard inside the modal, not in the row
`ParticipantRow` only knows `row.player` (an id) — computing editability there would require fetching every participant's player document. The modal already fetches the player, so the guard lives there: extend the existing spinner condition with `isCheckingAccess`, and when the player is loaded but not allowed, render the localized `player.edit.errors.noAccess` alert instead of `PlayerInfoSection` and hide the Confirm (save) button. Header close button and Cancel stay, so the dialog can always be dismissed.

### Decision 3: keep overwrite flow untouched
`ParticipantRow.handleEditPlayerSave` fires only from a successful save inside the modal; with the guard the denied path can never save, so the overwrite-confirm flow needs no changes.

## Risks / Trade-offs

- The user sees the edit button, opens the modal, and only then gets "no access" — accepted; hiding the button upfront would require batch-fetching all participant player entities (follow-up change if wanted).
- `useMyAssociations` 30s cache staleness applies, same as the drawer/page guards.

## Migration Plan

Additive UI gating; rollback = revert the commit.

## Open Questions

None.