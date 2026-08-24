## Why

Tournaments reference reusable regulation texts (created in the `regulation-entity-crud` change) so that rules and provisions are not re-typed per tournament. The updated `schemas/tournament.jsonс` adds a `regulations` array of regulation ids to the tournament schema, but the domain schema, form state, and edit UI do not support it yet.

## What Changes

- `tournamentSchema` gains `regulations: z.array(z.string().uuid()).default([])` (FK refs to `regulation.id`); old tournament documents parse with an empty array via the default; `publishedTournamentSchema` and `draftTournamentSchema` inherit the field automatically.
- `UpdateTournamentInput` gains `regulations?: string[]`; `update()` persists it; `createDraft`/`create` initialize it to `[]`.
- `TournamentFormState` gains `regulations: string[]`; `tournamentToFormState`/`formStateToUpdateInput` round-trip it (dirty tracking works via the existing JSON snapshot); new handlers `addRegulation(id)` (duplicate-safe) and `removeRegulation(id)`.
- General info tab of `TournamentEditForm`: below the description `ExpandableField` — a «+ Регламент» button styled like `ExpandableField` (`btn btn-ghost justify-start px-2 text-primary expandable-field basic-expandable` + `BsPlus`); when at least one regulation is selected, a «Регламенты» label with removable outline badges (× button, tie-breaks badge pattern) appears above the button; each additional selection adds a badge next to the others; when none are selected only the single «+ Регламент» button is shown.
- New `RegulationPickerModal` (UX cloned from `AssociationPickerModal`): modal with a scrollable (`max-h-80 overflow-y-auto`) list of localized regulation titles from `regulationService.listEditable(uid, managedAssociationIds, isAdmin)` — regulations the current user can edit; already-selected ids are excluded from the list; selecting closes the modal and adds the badge.
- No Firestore rules/index changes (the array is a plain field; tournament updates are already allowed for owner/manager/admin).
- i18n keys: `tournament.edit.regulations`, `addRegulation`, `selectRegulation`, `noRegulations` in ru/en.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `tournament-management`: the tournament entity gains the `regulations` array (schema + update input + form state round-trip) and the general info section gains the regulations picker UI (button, badges, modal).

## Impact

- **Modified:** `src/domain/tournament.ts` (+1 field in schema), `src/services/tournamentService.ts` (`UpdateTournamentInput`, `update`, create paths), `src/hooks/useTournamentForm.ts` (form state, conversions, 2 handlers), `src/components/tournament/TournamentEditForm.tsx` (GeneralInfoSection UI), `src/locales/ru/translation.json` + `en`.
- **New:** `src/components/tournament/RegulationPickerModal.tsx`.
- **Known limitation:** a saved regulation that the current user cannot edit (selected earlier by another organizer) is not in `listEditable`, so its badge falls back to an «untitled» placeholder; a follow-up can fetch titles via `getById`.
- **Dependencies:** none new; builds on the `regulation-management` capability.