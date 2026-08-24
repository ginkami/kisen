## Context

The `regulation` entity (capability `regulation-management`) provides reusable localized Markdown texts. `regulationService.listEditable` returns the regulations the current user can edit. The `tournament-regulations-field` change already implemented the regulations array + picker UI for tournaments (`TournamentEditForm.GeneralInfoSection` + `RegulationPickerModal`). This change applies the same pattern to events — which are simpler (no tabs, no arbiter, no participants, no publish path).

`schemas/event.jsonс` (user-updated) now declares a `regulations` array of `UUIDv7` refs on the event.

## Goals / Non-Goals

**Goals:**

- `eventSchema.regulations: string[]` (uuid refs, default `[]`) with backward compatibility.
- Persist through `CreateEventInput`/`UpdateEventournamentInput` and round-trip through `EventFormState`.
- Event edit form UI: single «+ Регламент» ExpandableField-styled button when empty; «Регламенты» label + removable badges + button when non-empty; `RegulationPickerModal` with unselected, user-editable regulations.
- Reuse `regulationService.listEditable` and `RegulationPickerModal` (already exist from the tournament change).

**Non-Goals:**

- Rendering regulation content (Markdown) anywhere in the event form — only titles in badges/picker.
- Public event page display of regulations.
- Ordering/drag-reorder of regulations.
- Resolving titles of non-editable saved regulations (untitled fallback).
- Firestore rules/index/schema changes.

## Decisions

1. **`z.array(z.string().uuid()).default([])` in `eventSchema`.** Same as tournaments. Old documents parse with `[]`. `draftEventSchema` inherits it.

2. **Store ids, resolve titles at render via `listEditable`.** The badge title comes from the regulations loaded by the modal query. `EventEditForm` reuses the same `useQuery` result for badges. Same as tournaments.

3. **Dedicated button styled like ExpandableField.** Same visual classes as the tournament's regulations button. Not the `ExpandableField` component itself (different semantics — opens a modal).

4. **Badges follow the tie-breaks pattern** (`badge badge-outline gap-2` + ghost × button → `removeRegulation`). Label + badges render only when `regulations.length > 0`; the «+ Регламент» button is always rendered below.

5. **Modal filters out already-selected ids; `addRegulation` is duplicate-safe.** Same as tournaments.

6. **Handlers in `useEventForm` mirror `useTournamentForm.addRegulation`/`removeRegulation`:** immutable array updates wrapped in the hook's update path so dirty snapshot and `setHasUnsavedChanges` react automatically.

## Risks / Trade-offs

- [Saved regulation not editable by the current user shows an «untitled» badge] → accepted limitation (same as tournaments).
- [Regulation deleted after being linked leaves a dangling id] → badge renders placeholder; no cascade delete — same pattern as tournament/parentEvent references.

## Migration Plan

None. Schema default covers old documents; writes only include the array when the form saves.