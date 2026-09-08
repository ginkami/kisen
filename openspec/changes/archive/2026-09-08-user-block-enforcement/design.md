## Context

The `users/{uid}` document already carries `auth.isActive` (written `true` on every creation path), and the `User` type declares `auth?: UserAuth` — but `userService.toPublicUser` drops the `auth` field, so no client code can see it. The profile is loaded once per session via `getDoc` (TanStack Query, 5-minute stale time) with no live updates. `AuthForm` displays thrown error messages verbatim, which makes a localized thrown error a working notification channel. Firestore rules currently allow every authenticated user to write every collection (subject to role/ownership checks) and allow a user to update their own profile except the `role` key — so a blocked user with a modified client could keep writing and could re-enable their own `auth.isActive`.

## Goals / Non-Goals

- Goals: blocked users cannot sign in (with a clear localized notice); active blocked sessions are terminated near-real-time with a home-screen notice; blocked users disappear from the manager invite search; Firestore rules deny all content writes for blocked users and prevent self-unblocking.
- Non-Goals: no Firebase Auth-level disabling (needs Admin SDK); no admin UI for the flag; no changes to read rules (the client must be able to read its own doc to detect blocking); no changes to the draft-creation flow.

## Decisions

### Decision 1: expose `auth` on the client user
`toPublicUser` maps `auth: data.auth` (type stays optional). Backward compatibility: "blocked" is strictly `auth?.isActive === false` — missing `auth`/`isActive` (legacy documents) counts as active.

### Decision 2: block at both sign-in paths, throw a localized error
`signIn` and `signInGoogle` load the profile via the existing `ensureUserProfile`; when blocked they sign out of Firebase, clear the profile cache, and throw `new Error(i18n.t('auth.errors.userBlocked'))`. `AuthForm` already renders thrown messages, so no form changes are needed. `signUp` is untouched (new users are created active).

### Decision 3: `onSnapshot` on the own user document for live termination, ignoring cache-sourced snapshots
While `firebaseUser` is set, `AuthContext` subscribes to `doc(users/{uid})`. The next callback ignores snapshots served from the persistent local cache (`snapshot.metadata.fromCache`) — after a block is lifted, the cache can hold a stale `isActive=false` while the subscription was down, which would otherwise immediately kick the re-authenticated user out again. Only server-sourced snapshots trigger the forced logout + sessionStorage notice. The subscription is cancelled automatically once auth state changes to signed-out. Permission errors are logged and ignored (the forced logout does not depend on them).

### Decision 4: dismissal notice via sessionStorage + Layout banner
Forced logout is not user-initiated, so a `BlockedNoticeBanner` (rendered in `Layout`, under the header) reads the `auth.blockedNotice` sessionStorage flag on mount, shows the same localized text, and clears the flag on dismissal or on the next mount render. sessionStorage keeps the notice scoped to the tab and session.

### Decision 5: invite search filter in the service
`userService.searchByFamilyName` filters out `auth?.isActive === false` results in memory — no new indexes, and both the manager invite input and any future consumers get only active users.

### Decision 6: rules gate via `isUserActive()` on every content write
New helper: `get(users/{uid}).data.auth.isActive != false` (missing field = active). Applied with correct parenthesization to every write rule of associations, players, tournaments, events, and regulations. The users `update` rule additionally requires `isUserActive()` and extends the protected-keys check with `auth.isActive`, so a blocked user can neither write content nor un-block themselves; users `read`/`create` stay ungated (blocking detection + signup). Each rules evaluation gains one cached `get()` — accepted.

## Risks / Trade-offs

- One extra document read per write-rule evaluation (Firestore deduplicates repeated `get()` calls within a single evaluation) — accepted for defense-in-depth.
- `onSnapshot` adds one long-lived listener per signed-in session — same cost profile as the auth state listener.
- Deploy note: rules take effect only after `firebase deploy --only firestore:rules`.

## Migration Plan

Client changes are additive; rules changes require deployment. Rollback = revert the commit and redeploy the previous rules.

## Open Questions

None.