## Why

Admins need to temporarily block users (the `users/{uid}.auth.isActive` flag already exists in the schema and is written as `true` on signup), but nothing enforces it: the client never receives the flag (the users service mapper drops `auth`), sign-in succeeds for blocked users, active sessions continue indefinitely, blocked users can still be invited as association managers, and a modified client could keep writing data.

## What Changes

- `userService.toPublicUser` maps the `auth` field so `user.auth.isActive` is available client-side; legacy documents without `auth` are treated as active.
- Sign-in (email and Google) rejects blocked users: the Firebase session is signed out and a localized error «Данный пользователь временно заблокирован» is shown in the auth form.
- `AuthContext` subscribes to its own `users/{uid}` document while signed in; when `auth.isActive` flips to `false`, the session is signed out immediately and a dismissal notice is stored for the UI.
- New `BlockedNoticeBanner` rendered in `Layout` shows the blocked notice after a forced logout.
- Manager invite search excludes blocked users.
- Firestore rules: new `isUserActive()` helper gates all writes (associations, players, tournaments, events, regulations) and self-profile updates; users can no longer re-enable `auth.isActive` themselves; users reads stay allowed so the client can detect blocking.
- New locale key `auth.errors.userBlocked` (ru/en).

## Capabilities

### New Capabilities

- `user-blocking`: enforcement of the `auth.isActive` flag — sign-in rejection, live session termination with a notice, blocked-user exclusion from the manager invite search, and Firestore write gating.

### Modified Capabilities

- (none)

## Impact

- `src/services/userService.ts` (auth mapping + invite search filter), `src/context/AuthContext.tsx` (blocked checks + snapshot listener), `src/components/BlockedNoticeBanner.tsx` (new), `src/components/Layout.tsx` (banner), `firestore.rules` (`isUserActive()` helper + write gates + users update protection), `src/locales/ru/translation.json` + `en`.
- Rules change requires `firebase deploy --only firestore:rules` to take effect.
- Out of scope: blocking at the Firebase Auth layer (Admin SDK `disableUser`, needs backend); an admin UI for toggling the flag (currently Firestore console).