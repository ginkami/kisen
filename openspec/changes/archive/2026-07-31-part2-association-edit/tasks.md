## 1. Service layer

- [x] 1.1 In `src/services/associationService.ts`, add `create(input)`, `update(input)`, `delete(id)`, `slugExists(slug, excludeId?)` methods.
- [x] 1.2 In `src/services/firestoreAssociationRepository.ts`, add `getBySlug(slug)` and `slugExists(slug)` methods.
- [x] 1.3 In `src/services/userService.ts`, add `searchByFamilyName(prefix)`, `getByEmail(email)`, `getByIds(ids)` methods.

## 2. Firestore rules

- [x] 2.1 In `firestore.rules`, update association permissions: `create` for admin/manager, `update` for admin/creator/managers, `delete` for admin/creator. Add `isCreatorOf()` helper.

## 3. Hook

- [x] 3.1 Create `src/hooks/useAssociationForm.ts`: load via `useQuery`, form state, dirty tracking, `useMutation` for save/delete, validation, manager profiles loading.

## 4. Form components

- [x] 4.1 Create `src/components/association/AssociationInfoSection.tsx`: LocaleTabs, title (required), slug (prefixed), description (ExpandableField), country + location (ExpandableFields).
- [x] 4.2 Create `src/components/association/ManagerInviteInput.tsx`: dual-mode autocomplete (familyName search vs email validation), "Выбрать" cards.
- [x] 4.3 Create `src/components/association/AssociationManagersSection.tsx`: badges (createdBy, managers, pendingInvites) with role-gated remove buttons + confirm, ManagerInviteInput.
- [x] 4.4 Create `src/components/association/AssociationEditForm.tsx`: header block (h1, document title, save/delete buttons + confirm), info section, managers section.

## 5. Page wiring

- [x] 5.1 In `src/pages/AssociationEditPage.tsx`, replace placeholder with `AssociationEditForm` (extract `id` param, pass to `useAssociationForm`).

## 6. Translations

- [x] 6.1 Add keys under `association.edit.*` in `src/locales/ru/translation.json` and `src/locales/en/translation.json` (title, slug, description, country, location, managers section title, invite label, invite placeholder, select button, delete confirm, etc.).

## 7. Verification

- [x] 7.1 Run `npx tsc -b --noEmit` and resolve any type errors.
