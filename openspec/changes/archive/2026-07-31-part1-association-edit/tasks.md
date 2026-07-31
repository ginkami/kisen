## 1. Service and repository

- [x] 1.1 In `src/services/firestoreAssociationRepository.ts`, add `listAll(): Promise<Association[]>` — fetch entire `associations` collection.
- [x] 1.2 In `src/services/associationService.ts`, add `listAll(): Promise<Association[]>` — proxy to repository.

## 2. Hook

- [x] 2.1 In `src/hooks/useAssociations.ts`, add `useAssociationsForPanel(userId, role)` hook: admin → `listAll()`, manager/user → `listMyAssociations(userId)`.

## 3. Routes and placeholder page

- [x] 3.1 Create `src/pages/AssociationEditPage.tsx` — placeholder component ("Association edit form will appear here").
- [x] 3.2 In `src/App.tsx`, add routes `/assn/new` and `/assn/:id/edit` pointing to `AssociationEditPage`.

## 4. Admin drawer associations section

- [x] 4.1 In `src/components/AdminDrawer.tsx`, replace the Associations placeholder with: filter input (`BsFunnel`), "+ Ассоциация" button (role-gated), scrollable list of associations (title in current locale), navigation to `/assn/:id/edit` on click.
- [x] 4.2 Implement role-based visibility: admin sees all + always create button; manager sees own + create button hidden if already created; invited user sees invited + no create button; non-invited user sees disabled section.

## 5. Translations

- [x] 5.1 Add keys under `admin` in `src/locales/ru/translation.json` and `src/locales/en/translation.json`: `newAssociation`, `filterAssociations`, `noAssociations`, `associationsDisabled`.

## 6. Verification

- [x] 6.1 Run `npx tsc -b --noEmit` and resolve any type errors.