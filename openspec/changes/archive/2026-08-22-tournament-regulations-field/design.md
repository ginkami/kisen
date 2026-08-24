## Context

The `regulation` entity (collection `regulations`, capability `regulation-management`) provides reusable localized Markdown texts. `regulationService.listEditable(userId, managedAssociationIds, isAdmin)` already returns the regulations the current user can edit (created ∪ affiliated with managed associations ∪ all for admins). The tournament form (`useTournamentForm` + `TournamentEditForm.GeneralInfoSection`) edits localized fields with `ExpandableField` and uses picker modals (`AssociationPickerModal`, `EventPickerModal`) for entity references. `schemas/tournament.jsonс` (user-updated) now declares a `regulations` array of `UUIDv7` refs on the tournament.

## Goals / Non-Goals

**Goals:**

- `tournamentSchema.regulations: string[]` (uuid refs, default `[]`) with backward compatibility for existing documents.
- Persist the array through `UpdateTournamentInput` and round-trip it through `TournamentFormState` (dirty tracking included).
- General-info UI per spec: single «+ Регламент» ExpandableField-styled button when empty; «Регламенты» label + removable outline badges + the button when non-empty; `RegulationPickerModal` listing only unselected, user-editable regulations.
- Reuse `regulationService.listEditable` (same data source as the admin drawer) inside the modal.

**Non-Goals:**

- Rendering regulation content (Markdown) anywhere in the tournament form — only titles in badges/picker.
- Public tournament page display of regulations.
- Ordering/drag-reorder of regulations (array order = selection order).
- Resolving titles of non-editable saved regulations (known limitation: «untitled» fallback badge).
- Firestore rules/index changes.

## Decisions

1. **`z.array(z.string().uuid()).default([])` in `tournamentSchema`.** The default makes old documents (no `regulations` field) parse with an empty array — no migration. `publishedTournamentSchema` (omit/extend keeps the field) and `draftTournamentSchema` inherit it unchanged. Alternative rejected: `optional()` — forces `?? []` checks at every consumer and makes the form round-trip noisier.

2. **Store ids, resolve titles at render time via `listEditable`.** The badge title comes from the regulations loaded by the modal query. The modal fetches once per mount (`useQuery` keyed `['regulations', 'editable', userId, managedAssociationIds, isAdmin]`); the GeneralInfoSection reuses the same query result for badges. Alternative rejected: denormalizing titles into the tournament document — violates the single-source rule for localized titles (regulation edits would not propagate).

3. **Dedicated button styled like ExpandableField, not the `ExpandableField` component itself.** The picker button opens a modal (different semantics from expand/collapse); we only replicate the visual classes (`btn btn-ghost justify-start px-2 text-primary expandable-field basic-expandable` + `BsPlus`) for visual consistency with the description/venue fields above it.

4. **Badges follow the tie-breaks pattern** (`badge badge-outline gap-2` + ghost × button calling `removeRegulation(id)`), laid out in a `flex flex-wrap gap-2` row under a `label-text` «Регламенты» label. The label + badges block renders only when `regulations.length > 0`; the «+ Регламент» button is always rendered below it.

5. **Modal filters out already-selected ids** (`selectedIds: string[]` prop) so a regulation cannot be added twice; `addRegulation` is additionally duplicate-safe (no-op when the id is present).

6. **Handlers in `useTournamentForm` mirror `addTieBreak`/`removeTieBreak`:** immutable array updates wrapped in the hook's update path so the dirty snapshot and `setHasUnsavedChanges` react automatically. No normalization needed.

## Risks / Trade-offs

- [Saved regulation not editable by the current user shows an «untitled» badge] → accepted limitation (documented in proposal); follow-up: batch `getById` fetch for missing titles.
- [`listEditable` in the modal runs N parallel queries for many managed associations] → same accepted trade-off as the admin drawer.
- [Regulation deleted after being linked to a tournament leaves a dangling id] → badge renders placeholder; no cascade delete — same pattern as `parentEvent`/`hostAssociation` references in the project.

## Migration Plan

None. Schema default covers old documents; writes only include the array when the form saves.