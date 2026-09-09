## 1. Stale notice flag lifecycle

- [x] 1.1 In `src/context/AuthContext.tsx`, import `clearBlockedNotice`; in the profile query, after `ensureUserProfile` resolves with an existing profile, run `clearBlockedNotice()` when `!isUserBlocked(profile)` (blocked profiles keep the flag)

## 2. Guard loading states

- [x] 2.1 In `src/components/appAdmin/AppAdminPanel.tsx`, render a centered spinner while `isLoading`; render the access alert only when `!isLoading && (!isAuthenticated || user?.role !== 'admin')`
- [x] 2.2 In `src/components/user/UserEditForm.tsx`, the same loading-vs-verdict split for the admin guard

## 3. Tests

- [x] 3.1 `src/test/userBlocking.test.tsx`: successful authentication with an active profile clears a stale flag; a blocked profile keeps it
- [x] 3.2 `src/test/appAdminPage.test.tsx`: while `isLoading` a spinner is shown and no access alert; existing admin/non-admin scenarios keep working
- [x] 3.3 `src/test/userEditPage.test.tsx`: while `isLoading` the admin guard shows a spinner, not the access alert

## 4. Spec sync repair

- [x] 4.1 During sync, regenerate `openspec/specs/app-administration/spec.md` from the intact archived delta (repairing Cyrillic corrupted by a console-encoding accident) with the modified access requirement applied

## 5. Validation

- [x] 5.1 `npx tsc -b` passes
- [x] 5.2 `npx vitest run` all green (616 passed, was 612 baseline + 4 new)
- [x] 5.3 `npx vite build` succeeds
- [x] 5.4 `openspec validate fix-blocked-notice-flash` passes

