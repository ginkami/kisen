## 1. Domain schema

- [x] 1.1 Create `src/domain/regulation.ts`: `regulationLocaleSchema` (`title: z.string().min(1)`, `description: z.string().optional()`), `regulationSchema` (`id` uuid, `createdBy` min(1), `association` uuid nullable, `updatedAt` date, `locales: localeSchema(...)` refined ≥1 locale), `draftRegulationSchema` (id/createdBy/updatedAt optional)
- [x] 1.2 `schemas/regulation.ts` documentation mirror (optional TS value object like `schemas/tieBreak.ts`) — only if consistent with sibling entities; otherwise skip and rely on the user-authored `schemas/regulation.jsonc`

## 2. Repository and service

- [x] 2.1 `src/services/repository.ts`: add `ListRegulationsFilters { createdBy?: string; association?: string }` and `RegulationRepository { getById, list, create, update, delete }`
- [x] 2.2 Create `src/services/firestoreRegulationRepository.ts`: collection `regulations`, `datesToTimestamps`/`timestampsToDates` conversions, `list` with `where` filters + `orderBy('updatedAt', 'desc')`
- [x] 2.3 Create `src/services/regulationService.ts`: `getById`, `create` (uuidv7 id, `updatedAt = now`, association `'' → null`, schema parse), `update` (404 check, refresh `updatedAt`), `delete`, `listEditable(userId, managedAssociationIds, isAdmin)` — admin → `list({})`, else parallel `list({ createdBy })` + per-association `list({ association })`, Map-dedupe, sort `updatedAt` desc

## 3. Security rules and indexes

- [x] 3.1 `firestore.rules`: add `match /regulations/{regulationId}` block — read public; create authenticated (+ `isManagerOf(association)` when set); update admin | owner | `isManagerOf(association)` with `isValidAssociationChange` guard; delete admin | owner ONLY (no manager delete)
- [x] 3.2 `firestore.indexes.json`: add `regulations` composite indexes (createdBy ASC + updatedAt DESC) and (association ASC + updatedAt DESC)

## 4. Form hook and page

- [x] 4.1 Create `src/hooks/useRegulationForm.ts` (clone `useEventForm` minus slug): query `['regulation', id]`, form state `{ association, locales }`, dirty tracking via JSON snapshots, `filterLocalesForSave`, validation (≥1 non-empty title), save/delete `useMutation`, `setHasUnsavedChanges`, create → `navigate(/regulations/:id/edit, { replace: true })`, delete → `navigate('/')`
- [x] 4.2 Create `src/components/regulation/RegulationEditForm.tsx` (clone `EventEditForm` minus slug block): header (overline, localized title, document.title, Save; Delete only when `firebaseUser.uid === regulation.createdBy` or `user.role === 'admin'`), «Основная информация» (LocaleTabs + title* + ExpandableField description), «Дополнительно» (AssociationPickerModal), ConfirmModal for delete, error alerts
- [x] 4.3 Create `src/pages/RegulationEditPage.tsx` (`useParams`, `key={id ?? 'new'}`)
- [x] 4.4 `src/App.tsx`: add routes `regulations/new` and `regulations/:id/edit`

## 5. Admin drawer

- [x] 5.1 `src/components/AdminDrawer.tsx`: add «Регламенты» accordion section (enabled for all authenticated): `BsPlus` create button → `/regulations/new`, `useQuery` on `regulationService.listEditable(firebaseUser.uid, managedAssociationIds, isAdmin)` (managed ids from already-loaded `associations`), scrollable `max-h-96` list of localized titles → `/regulations/:id/edit`, empty-state hint, loading spinner

## 6. Localization

- [x] 6.1 `src/locales/ru/translation.json`: `regulation.edit.*` (managementPanel «Редактирование регламента», newTitle «Новый регламент», info «Основная информация», title «Название», description «Описание», binding «Дополнительно», association «Ассоциация», noAssociation «Не указана», save «Сохранить», delete «Удалить», deleteConfirmTitle, deleteConfirm, errors.load/save/delete) + `admin.regulations` «Регламенты», `admin.newRegulation` «Регламент», `admin.noRegulations`
- [x] 6.2 `src/locales/en/translation.json`: same keys in English (managementPanel "Regulation editing", newTitle "New regulation", ... `admin.regulations` "Regulations", `admin.newRegulation` "Regulation", `admin.noRegulations`)

## 7. Verification

- [x] 7.1 Run `npx tsc --noEmit` — no type errors
- [x] 7.2 Run `npm run build` — build succeeds
- [x] 7.3 Run existing test suite (`npx vitest run`) — no regressions
- [ ] 7.4 Manual check: create/edit/delete flows per access matrix (creator, association manager, admin); drawer section renders list; delete button visibility
- [x] 7.5 Note: deploy `firebase deploy --only firestore:rules,indexes` (manual, out of code scope)

## 8. Docs

- [x] 8.1 Mark tasks complete and archive the change via /opsx:archive after user acceptance