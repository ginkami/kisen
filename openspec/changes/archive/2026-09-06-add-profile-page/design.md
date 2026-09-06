## Context

`/profile` renders a placeholder. Existing edit pages (`RegulationEditForm`, `TournamentEditForm`, `AssociationEditForm`) share a visual language: over-title + `h1` + right-aligned buttons, `card bg-base-200` sections, `LocaleTabs` for locale-dependent fields, inline validation, `document.title` pattern, and an in-component auth guard (`if (!isAuthenticated) return <Navigate to="/login" replace />`).

Key data-source finding: `useAuth().user` is a **public** profile — `toPublicUser` in `userService.ts` strips the `auth` field, so neither `providers` nor `passwordHash` are available from it. Firebase Auth SDK (`firebaseUser.providerData`) is the reliable client-side source for both providers and the fact that a password is assigned.

## Goals / Non-Goals

**Goals:**
- Profile page matching the existing edit-page UX, with live `h1`, dirty-gated Save, and disabled Delete.
- Locale-dependent profile data editing (ru/en) with persistence and cache refresh.
- Providers display + password change/add applied immediately via Firebase Auth (own button per user decision).
- Shortcuts to managed associations.

**Non-Goals:**
- Account deletion (button disabled; separate task).
- Email change, role management, admin user administration.
- Syncing the Firestore `auth.passwordHash` field (it is `null` in all current flows and nothing reads it).

## Decisions

### Decision 1: Data sources per field
- `email`, `role`, `locales` → `useAuth().user` (public profile).
- Providers and "password assigned" → `firebaseUser.providerData`: providers are the raw `providerId` list; a password is assigned iff some provider has `providerId === 'password'`.
- Managed associations → existing `useMyAssociations(uid)` (already merges creator + manager results).

### Decision 2: Save flow and live h1
- `h1` renders from **form state** (`${familyName} ${givenName}` of the active locale, space-separated — natural for a person's name header; the `familyName, givenName` comma format stays in association badges). Editing updates the `h1` immediately, like `displayTitle` in `RegulationEditForm`.
- Header «Сохранить» saves **only** the profile locales: `userService.updateUser(uid, { locales })`, then `queryClient.setQueryData(['authUser', uid], updated)` so `UserMenu` and any other consumer refresh instantly.
- `isDirty` = deep comparison of the form locales against the loaded user locales.

### Decision 3: Password applies immediately (own button)
User decision: the password block has its own action button and does not participate in the header Save / `isDirty`.
- Change mode (`password` provider present): `reauthenticateWithCredential(currentUser, EmailAuthProvider.credential(email, oldPassword))` then `updatePassword(currentUser, newPassword)`.
- Add mode (no password provider): `linkWithCredential(currentUser, EmailAuthProvider.credential(email, newPassword))`; on success `currentUser.reload()` so the provider badge appears, then sync `auth.providers` into Firestore via `userService.updateUser` for consistency with profiles created at signup.
- Error codes mapped to i18n: `auth/wrong-password`, `auth/weak-password`, `auth/requires-recent-login`, `auth/email-already-in-use`, `auth/too-many-requests`; unknown codes → generic error message.

### Decision 4: Component decomposition
- `src/pages/ProfilePage.tsx` — thin: auth guard + loading state + `<ProfileEditForm />` (mirrors `RegulationEditPage` → `RegulationEditForm`, but without route params the guard lives in the page).
- `src/components/profile/ProfileEditForm.tsx` — header (over-title, h1, Save/Delete), unnamed immutable section, «Профильные данные» section with `LocaleTabs`, «Ассоциации, которыми управляете» section.
- `src/components/profile/PasswordSection.tsx` — self-contained: derives mode from `firebaseUser.providerData`, owns field state, validation, Firebase calls and error display; placed inside the «Провайдеры аутентификации» card.
- `src/hooks/useProfileForm.ts` — form locales state, `updateLocale`, `isDirty`, `save`, `isSaving`, `saveError`.

### Decision 5: Validation rules (password section)
- Change mode: old password required.
- New password: min length 6 (Firebase Auth minimum).
- Repeat must equal the new password.
- Apply button disabled until all fields are valid and non-empty; errors shown inline as `text-error` after submit attempts or server rejection.

### Decision 6: Providers badge labels
`google.com → 'Google'`, `password → t('profile.edit.providers.password')` («Email / Пароль»), anything else renders the raw `providerId`. Badges reuse the `badge badge-lg badge-ghost` style from `AssociationManagersSection`.

## Risks / Trade-offs

- **[providerData freshness]** After `linkWithCredential` the Firebase user object must be `reload()`-ed for `providerData` to include the password provider; otherwise the section would still show «Добавить пароль». Mitigated by calling `reload()` and re-reading provider data from the current `firebaseUser`.
- **[passwordHash divergence]** Firestore `auth.passwordHash` is not updated when the Firebase Auth password changes. Accepted: it is `null` everywhere today and never read; documented in Non-Goals.
- **[requires-recent-login]** A stale session can make `updatePassword` fail with `auth/requires-recent-login`; surfaced as a localized alert telling the user to re-login. Full re-auth UX is out of scope.
