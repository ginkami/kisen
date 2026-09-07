# Tasks

## 1. Implementation

- [x] 1.1 `src/components/profile/ProfileEditForm.tsx`: add `pendingLeave` (`Association | null`), `leaveError`, `isLeaving` state; restructure removable badges (manager, not creator) into a `span.badge` wrapper containing the `Link` and a В«Г—В» button (`BsX`); creator badges keep the current markup without the button
- [x] 1.2 Add `ConfirmModal` (`variant="error"`) wired to `pendingLeave`; on confirm call `associationService.update({ id, existing, managers: managers.filter(...) })`, then `queryClient.invalidateQueries({ queryKey: ['associations', 'my', profile.id] })`; on failure show an `alert alert-error` with `profile.edit.associations.errors.leave`

## 2. Translations

- [x] 2.1 Add `profile.edit.associations.leaveConfirmTitle`, `profile.edit.associations.leaveConfirm` (with `{{title}}`), `profile.edit.associations.errors.leave` to `src/locales/ru/translation.json` and `src/locales/en/translation.json`

## 3. Tests

- [x] 3.1 `src/test/profilePage.test.tsx`: mock `../services/associationService.ts`; extend `makeAssociation` with managers; add scenarios вЂ” creator badge has no В«Г—В», manager badge has В«Г—В», cancel does not call `update`, confirm calls `update` without the user id and closes the modal, rejected `update` shows the error alert
- [x] 3.2 Run `npx vitest run src/test/profilePage.test.tsx`, full `npx vitest run`, `npx tsc -b`, `npx vite build`
