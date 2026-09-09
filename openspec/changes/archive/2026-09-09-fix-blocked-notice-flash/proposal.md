## Why

While verifying `/app-admin`, a yellow warning banner appeared for about a second and then disappeared. Two defects combine here:

1. The blocked-notice flag (`auth.blockedNotice` in sessionStorage) is never cleared after a successful authentication of an active user — a flag left over from an earlier rejected sign-in keeps the "user blocked" banner alive in the tab indefinitely.
2. `AppAdminPanel` (and, latently, `UserEditForm`) renders the localized access-restricted `alert-warning` while authentication/profile data is still loading, so a full page load of `/app-admin` flashes a yellow alert that looks exactly like the blocked-notice banner.

## What Changes

- `AuthContext`: clear the stale blocked-notice flag when the profile query resolves with an existing, non-blocked profile (single place covering both restored sessions and fresh sign-ins). A blocked profile keeps the flag so the banner stays visible.
- `AppAdminPanel`: while auth/profile loading (`isLoading` from `useAuth`), render a spinner instead of the access alert; the guard verdict is only rendered once loading has finished.
- `UserEditForm`: the same loading-vs-verdict split for `/users/:id/edit`.
- Repair the `app-administration` main spec text (Cyrillic was corrupted by an encoding accident during its earlier sync) as part of this change's spec sync.

## Capabilities

### Modified Capabilities

- `user-blocking`: the blocked-notice lifecycle now specifies that a stale flag is cleared when an active profile is loaded after successful authentication.
- `app-administration`: the page access requirement now specifies a loading state (spinner) before the access verdict is rendered.

## Impact

- `src/context/AuthContext.tsx`, `src/components/appAdmin/AppAdminPanel.tsx`, `src/components/user/UserEditForm.tsx`; tests `src/test/userBlocking.test.tsx`, `src/test/appAdminPage.test.tsx`, `src/test/userEditPage.test.tsx`.
- `BlockedNoticeBanner.tsx` is unchanged — its event + sessionStorage design is correct; only the flag lifecycle and the guards change.
- No Firestore rules or index changes.
