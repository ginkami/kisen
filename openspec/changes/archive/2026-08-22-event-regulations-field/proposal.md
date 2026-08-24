## Why

Events (like tournaments) need to reference reusable regulation texts so that rules and provisions are not re-typed per event. The updated `schemas/event.jsonс` adds a `regulations` array of regulation ids to the event schema, but the domain schema, form state, and edit UI do not support it yet. This mirrors the `tournament-regulations-field` change applied to tournaments.

## What Changes

- `eventSchema` gains `regulations: z.array(z.string().uuid()).default([])` (FK refs to `regulation.id`); old event documents parse with an empty array via the default; `draftEventSchema` inherits the field automatically.
- `CreateEventInput` and `UpdateEventInput` gain `regulations?: string[]`; `create()` initializes it to `[]`; `update()` persists `input.regulations ?? existing.regulations`.
- `EventFormState` gains `regulations: string[]`; `eventToFormState`/`formStateToUpdateInput` round-trip it (dirty tracking works via the existing JSON snapshot); new handlers `addRegulation(id)` (duplicate-safe) and `removeRegulation(id)`.
- `EventEditForm`: below the description `ExpandableField` — a «+ Регламент» button styled like `ExpandableField`; when at least one regulation is selected, a «Регламенты» label with removable outline badges (× button) appears above the button; `RegulationPickerModal` listing only unselected, user-editable regulations from `regulationService.listEditable`.
- i18n keys: `event.edit.regulations`, `addRegulation`, `selectRegulation`, `noRegulations`, `untitledRegulation` in ru/en.
- No Firestore rules/index changes (the array is a plain field; event updates are already allowed for owner/manager/admin/creator).

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `event-management`: the event entity gains the `regulations` array (schema + create/update input + form state round-trip) and the event edit form gains the regulations picker UI (button, badges, modal).

## Impact

- **Modified:** `src/domain/event.ts` (+1 field), `src/services/eventService.ts` (CreateEventInput, UpdateEventInput, create, update), `src/hooks/useEventForm.ts` (form state, conversions, 2 handlers), `src/components/event/EventEditForm.tsx` (regulations UI block), `src/locales/ru/translation.json` + `en`.
- **Known limitation:** a saved regulation that the current user cannot edit (selected earlier by another organizer) is not in `listEditable`, so its badge falls back to an «untitled» placeholder; same as tournaments.
- **Dependencies:** none new; builds on the `regulation-management` capability.