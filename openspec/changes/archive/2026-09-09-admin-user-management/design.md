# admin-user-management — Design

## Context

The admin drawer (`src/components/AdminDrawer.tsx`) is a DaisyUI accordion (`name="admin-accordion"`) whose sections follow a common pattern: a search input with a leading icon, loading/empty/error states, and card lists navigating to edit pages via `handleNavigate` (with the unsaved-changes guard). `userService` already exposes `searchByFamilyName` (filters out blocked users — correct for manager invites, wrong for user administration), `getByEmail`, and `updateUser`. Firestore `users.update` rules already allow admins (custom claim `admin`) to change `role` and `auth.isActive`; non-admins cannot touch those keys. There is no Cloud Functions infrastructure (`functions/` absent; `firebase.json` only configures Firestore).

## Goals / Non-Goals

- Goals: admin-only "Users" drawer section with live email-prefix search; user edit page with role change, block/unblock, and password reset email.
- Non-Goals: editing profile names, deleting users, granting the `admin` role (custom claim is managed outside the app), setting another user's password instantly (requires Admin SDK/Cloud Functions — rejected for now).

## Decisions

### Decision 1: Dedicated `searchByEmailPrefix` without the blocked-user filter
`searchByFamilyName` excludes `auth.isActive === false` users because they must not be suggested as association managers. The admin user search must return **all** matching users (finding a blocked user is the whole point — to unblock them). A separate `searchByEmailPrefix(prefix)` runs a single-field range query on `email` (`>= prefix.toLowerCase()`, `<= prefix + '\uf8ff'`, `orderBy('email')`, `limit(20)`); automatic single-field indexes suffice, no `firestore.indexes.json` changes.

*Alternative considered:* reusing `searchByFamilyName` with a flag parameter — rejected: the invite search must stay safely filtered by default.

### Decision 2: Password "change" = `sendPasswordResetEmail` (user decision)
Client-side Firebase Auth cannot set another user's password (`updatePassword` works only for the signed-in user and requires recent login). Setting it for them requires the Admin SDK via Cloud Functions, which the project does not have (and deploying functions needs the Blaze plan). Chosen: the admin edit page has a "Send password reset email" button calling `sendPasswordResetEmail(auth, user.email)` with localized success/error feedback. This satisfies "without the old password" — the user sets a new password via the emailed link.

### Decision 3: Role dropdown limited to `manager` / `user`
The `admin` flag in Firebase Auth is a custom claim managed outside the app; the Firestore `role` field feeds UI gating. Offering `admin` in the dropdown would create a mismatch (Firestore role `admin` without the claim grants nothing server-side). The dropdown offers only `manager` and `user`. Role changes go through a new `setUserRole(id, role)` dot-path patch so the whole `auth` object is never rewritten by accident.

### Decision 4: Self-edit protection
Editing one's own account is allowed but the role dropdown and the blocked checkbox are disabled for the current admin's own profile — blocking yourself or demoting yourself mid-session is an easy mistake with no recovery path from the UI. Rules would allow it; the UI simply prevents it.

### Decision 5: Role + block saved together in one "Access" block
Both fields are pure `users/{uid}` mutations with no side effects between them; one Save button (mirroring the profile page's section UX where the password block is the only one with its own button because it has a different apply mechanism). Save runs `setUserRole` (when role changed) + `updateUser(id, { auth: { ...auth, isActive } })` (when block state changed), then invalidates the user query cache.

## Risks / Trade-offs

- **[Password reset depends on email deliverability]** If the target user's email is wrong or undeliverable, the reset never arrives. Firebase surfaces `auth/user-not-found`; other delivery failures are silent — the success alert states that the email was *sent*, not that it was received.
- **[Email prefix search exposes emails]** `users` reads are already open to any authenticated user (existing `getByEmail`), so the prefix search does not relax privacy beyond the status quo.
- **[Blocking takes effect live]** The `user-blocking` enforcement (onSnapshot sign-out) terminates a blocked user's session automatically; no extra handling here.

## Migration Plan

Pure additive UI/service change. No data migration, no rules deploy, no index deploy.
