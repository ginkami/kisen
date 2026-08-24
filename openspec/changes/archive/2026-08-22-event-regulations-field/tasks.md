## 1. Domain schema

- [x] 1.1 `src/domain/tournament.ts`: add `regulations: z.array(z.string().uuid()).default([])` to `eventSchema` (after `hostAssociation`); verify `draftEventSchema` inherits it; the documentation mirror `schemas/event.jsonс` already declares the field

## 2. Service

- [x] 2.1 `src/services/eventService.ts`: `CreateEventInput` += `regulations?: string[]`; `UpdateEventInput` += `regulations?: string[]`; `create()` initializes `regulations: input.regulations ?? []`; `update()` persists `input.regulations ?? existing.regulations`

## 3. Form hook

- [x] 3.1 `src/hooks/useEventForm.ts`: `EventFormState` += `regulations: string[]`; `eventToFormState` maps `event.regulations ?? []`; save mutation includes `regulations: formState.regulations` in the update input
- [x] 3.2 Add handlers `addRegulation(id: string)` (no-op when id already present) and `removeRegulation(id: string)` (immutable filter), exposed from the hook

## 4. UI

- [x] 4.1 `src/components/event/EventEditForm.tsx`: import `RegulationPickerModal`, `regulationService`, `useQuery`, `BsPlus`; add `useQuery` for `editableRegulations` (queryKey `['regulations', 'editable', uid, managedAssociationIds, isAdmin]`); add `regulationTitleById(id)` helper; add `showRegulationPicker` state
- [x] 4.2 In the «Основная информация» card, below the description `ExpandableField`, render the regulations block — «Регламенты» label + `flex flex-wrap gap-2` badges (`badge badge-outline gap-2`, × ghost button → `removeRegulation`) only when `regulations.length > 0`; always render the «+ Регламент» button styled like ExpandableField (`btn btn-ghost justify-start px-2 text-primary expandable-field basic-expandable` + `BsPlus`) opening the modal; `RegulationPickerModal` with `selectedIds` filter
- [x] 4.3 Wire `addRegulation`/`removeRegulation` from `useEventForm` into the component

## 5. Localization

- [x] 5.1 `src/locales/ru/translation.json`: `event.edit.regulations` = «Регламенты», `event.edit.addRegulation` = «Регламент», `event.edit.selectRegulation` = «Выбор регламента», `event.edit.noRegulations` = «Нет доступных регламентов», `event.edit.untitledRegulation` = «Без названия»
- [x] 5.2 `src/locales/en/translation.json`: same keys in English ("Regulations", "Regulation", "Select regulation", "No regulations available", "Untitled")

## 6. Verification

- [x] 6.1 Run `npx tsc --noEmit` — no type errors
- [x] 6.2 Run `npx vitest run src/test/locales.test.ts src/test/crosstableModel.test.ts` — no regressions
- [x] 6.3 Manual check: empty state shows only «+ Регламент»; picker lists unselected editable regulations; badges add/remove; save persists; reload restores badges; old event loads with empty list

## 7. Docs

- [x] 7.1 Mark tasks complete and archive the change via /opsx:archive after user acceptance