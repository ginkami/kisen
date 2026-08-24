## 1. Domain schema

- [x] 1.1 `src/domain/tournament.ts`: add `regulations: z.array(z.string().uuid()).default([])` to `tournamentSchema` (after `country`); verify `publishedTournamentSchema`/`draftTournamentSchema` inherit it; update the documentation mirror `schemas/tournament.jsonс` if it drifts (it already declares the field — no change expected)

## 2. Service

- [x] 2.1 `src/services/tournamentService.ts`: `UpdateTournamentInput` += `regulations?: string[]`; `update()` persists `input.regulations ?? existing.regulations`; `createDraft`/`create` initialize `regulations: []`

## 3. Form hook

- [x] 3.1 `src/hooks/useTournamentForm.ts`: `TournamentFormState` += `regulations: string[]`; `tournamentToFormState` maps `tournament.regulations ?? []`; `formStateToUpdateInput` includes `regulations: state.regulations` (+ input type field)
- [x] 3.2 Add handlers `addRegulation(id: string)` (no-op when id already present) and `removeRegulation(id: string)` (immutable filter), exposed from the hook

## 4. UI

- [x] 4.1 Create `src/components/tournament/RegulationPickerModal.tsx` (clone of `AssociationPickerModal` UX): `modal modal-open` + `modal-box max-w-md`, scrollable `max-h-80 overflow-y-auto` list of `btn btn-ghost justify-start` items with localized titles; data via `useQuery` on `regulationService.listEditable(uid, managedAssociationIds, isAdmin)` (managed ids from `useAssociationsForPanel`/`useMyAssociations` data, admin flag from `useAuth`); props `selectedIds: string[]`, `onSelect(id)`, `onClose()`; filters out `selectedIds`; loading spinner; empty-state hint; Cancel button
- [x] 4.2 `TournamentEditForm.tsx` `GeneralInfoSection`: below the description `ExpandableField` render the regulations block — «Регламенты» label + `flex flex-wrap gap-2` badges (`badge badge-outline gap-2`, × ghost button → `removeRegulation`) only when `regulations.length > 0`; always render the «+ Регламент» button styled like ExpandableField (`btn btn-ghost justify-start px-2 text-primary expandable-field basic-expandable` + `BsPlus`) opening the modal; badge titles resolve from the editable-regulations query, fallback «untitled» placeholder for ids missing from the list
- [x] 4.3 Wire props: pass `regulations`, `onAdd`/`onRemove` handlers from `useTournamentForm` into `GeneralInfoSection`

## 5. Localization

- [x] 5.1 `src/locales/ru/translation.json`: `tournament.edit.regulations` = «Регламенты», `tournament.edit.addRegulation` = «Регламент», `tournament.edit.selectRegulation` = «Выбор регламента», `tournament.edit.noRegulations` = «Нет доступных регламентов», `tournament.edit.untitledRegulation` = «Без названия»
- [x] 5.2 `src/locales/en/translation.json`: same keys in English ("Regulations", "Regulation", "Select regulation", "No regulations available", "Untitled")

## 6. Verification

- [x] 6.1 Run `npx tsc --noEmit` — no type errors
- [x] 6.2 Run `npx vitest run` — no regressions (existing suites)
- [x] 6.3 Manual check: empty state shows only «+ Регламент»; picker lists unselected editable regulations; badges add/remove; save persists; reload restores badges; old tournament (no field) loads with empty list

## 7. Docs

- [x] 7.1 Mark tasks complete and archive the change via /opsx:archive after user acceptance