## Why

Admins currently have no UI to manage user accounts. Role changes and blocking require manual Firestore edits, and there is no way to help a user who lost their password. The admin drawer already hosts management sections (Tournaments, Players, Events, Associations, Regulations); a "Users" section fits the same UX. Firestore rules already permit admins (custom claim) to update `users/{uid}.role` and `auth.isActive`, so no rules changes are needed.

## What Changes

- Add a "Users" section to the admin drawer accordion below "Regulations", visible only to admins (`user.role === 'admin'`).
- The section has a single search input (BsSearch icon) performing live prefix search by user email (from 3 characters, debounced) — results render as clickable cards showing the localized display name (same logic as `getUserDisplayName` in the managers section), the email, a role badge, and a "blocked" badge when `auth.isActive === false`.
- New `userService.searchByEmailPrefix(prefix)` — email range query without the blocked-user filter (admins must be able to find blocked users to unblock them).
- New `/users/:id/edit` route with `UserEditPage` (admin-only) providing:
  - a "Access" block: role dropdown (`manager` / `user` only) and a "Blocked" checkbox backed by `auth.isActive`, saved together; disabled for the admin's own account to prevent self-lockout;
  - a read-only profile data display (names, email);
  - a "Change password" block that sends a password reset email to the user's address via `sendPasswordResetEmail` (Client SDK cannot set another user's password; no Cloud Functions infrastructure exists — user decision).
- New `userService.setUserRole(id, role)` dot-path patch.
- i18n keys `admin.users.*` and `user.edit.*` (ru/en).

## Capabilities

### New Capabilities

- `user-management`: admin drawer "Users" section (admin-only, email prefix search) and the user edit page (role change, block/unblock, password reset email).

## Impact

- `src/services/userService.ts` (new search + role methods), `src/components/AdminDrawer.tsx` (new section), `src/pages/UserEditPage.tsx` (new), `src/components/user/UserEditForm.tsx` (new), `src/App.tsx` (route), `src/locales/ru/translation.json` + `src/locales/en/translation.json`.
- No Firestore rules or index changes (single-field email range query uses automatic indexes).
- Out of scope: editing profile names, deleting users, granting the `admin` role (the admin flag is a custom claim managed outside the app), instant password setting (requires Cloud Functions).
