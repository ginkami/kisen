## Context

The participants tab (implemented in part1-participants-edit) renders editable participant cards with player-linking controls. Two gaps remain:

1. **No name validation**: participants can be saved/published with empty familyName and givenName across all locales. The domain `participantSchema` requires at least one locale with non-empty names (via `localeSchema` refine), but the form-layer `validateTournamentPublishForm` does not check participants.

2. **Player-linking visible to all**: regular users (`role: 'user'`) see the same link/unlink/autocomplete controls as admins and managers. These users cannot read the global `players` collection (Firestore rules restrict player writes to admins/owners/managers), so the controls are non-functional for them.

## Goals / Non-Goals

**Goals:**
- Validate participant names before publish (at least one locale with both familyName and givenName).
- Mark familyName and givenName as required (`*`) in the UI.
- Hide player-linking controls and familyName autocomplete for regular users.

**Non-Goals:**
- Changing Firestore security rules.
- Validating participant fields beyond names.
- Hiding the participants tab itself (regular users can still add manual participants).

## Decisions

### Decision 1: Participant validation in `validateTournamentPublishForm`

Add a check: for each `ParticipantRow` in `state.participants`, verify at least one locale has non-empty trimmed `familyName` and `givenName`. If any participant fails → `errors.participants = 'required'`.

- **Why per-row, not per-locale**: matches the domain schema's `localeSchema.refine` which requires at least one complete locale.
- **Why only on publish**: save-draft remains permissive (consistent with existing title/location/arbiter validation).

### Decision 2: Role-based `canLinkPlayers` prop

Compute `canLinkPlayers = user?.role === 'admin' || user?.role === 'manager'` in `TournamentEditForm` (same pattern as `canManagePlayers` in `AdminDrawer` and `canEditBinding` in `TournamentEditForm`). Pass it down through `ParticipantsSection` → `ParticipantRow`.

- **Why not check inside ParticipantRow**: keeps `ParticipantRow` presentational; the parent owns the auth context.

### Decision 3: What gets hidden when `!canLinkPlayers`

In `ParticipantRow`, when `canLinkPlayers === false`:
- The entire "Player link controls row" (lines 131–181) is not rendered.
- The familyName autocomplete popover (lines 202–212) is not rendered; `showAutocomplete` stays `false`.
- `participant.player` stays `null` (no linking possible).

All other fields (names, rating, rank, country, location, residence, title) remain editable.

## Risks / Trade-offs

- **[Empty participants array passes validation]** — if `state.participants` is `[]`, validation passes (no participants = no error). This is acceptable: a tournament can be published without participants.