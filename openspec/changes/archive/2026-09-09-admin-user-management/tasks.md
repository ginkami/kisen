## 1. Service layer

- [x] 1.1 Add `searchByEmailPrefix(prefix: string): Promise<User[]>` to `src/services/userService.ts` — email range query (`>=` prefix, `<=` prefix + `\uf8ff`, `orderBy('email')`, `limit(20)`), no `isActive` filtering, results via `toPublicUser`
- [x] 1.2 Add `setUserRole(id: string, role: 'manager' | 'user'): Promise<void>` — dot-path `'role'` patch with `updatedAt`
- [x] 1.3 Add `src/test/userServiceSearch.test.ts`: prefix query shape, includes blocked users, limit 20; `setUserRole` patches `role`

## 2. Admin drawer section

- [x] 2.1 Add the "Users" accordion section below "Regulations" in `src/components/AdminDrawer.tsx`, rendered only when `isAdmin`
- [x] 2.2 Email search state with 300ms debounce calling `searchByEmailPrefix` (min 3 chars); card list (display name via the shared `getUserDisplayName` logic, email, role badge, blocked badge); loading/empty/error states
- [x] 2.3 Card click navigates to `/users/{id}/edit` via `handleNavigate`

## 3. User edit page

- [x] 3.1 Create `src/pages/UserEditPage.tsx` (thin wrapper over `UserEditForm`, key by `:id`) and register the `users/:id/edit` route in `src/App.tsx`
- [x] 3.2 Create `src/components/user/UserEditForm.tsx`: admin-only guard (access-restricted alert for non-admins), user query, read-only profile display, "Access" block (role dropdown `manager`/`user` + blocked checkbox, Save → `setUserRole` + `updateUser` auth merge, self-edit disabled), "Change password" block (`sendPasswordResetEmail` + localized success/error alerts)
- [x] 3.3 Add i18n keys `admin.users.*` and `user.edit.*` to `src/locales/ru/translation.json` and `src/locales/en/translation.json`

## 4. Tests

- [x] 4.1 Add `src/test/userEditPage.test.tsx`: role change, block checkbox patches `auth.isActive`, unblock, password reset email success/error, non-admin guard, self-edit disabled state
- [x] 4.2 Add drawer section test: section visibility (admin vs non-admin), search renders cards, card click navigates

## 5. Validation

- [x] 5.1 `npx tsc -b` passes
- [x] 5.2 `npx vitest run` all green (606 passed, was 591 baseline + 15 new)
- [x] 5.3 `npx vite build` succeeds
- [x] 5.4 `openspec validate admin-user-management` passes

