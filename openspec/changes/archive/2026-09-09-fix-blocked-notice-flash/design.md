# fix-blocked-notice-flash — Design

## Context

`BlockedNoticeBanner` is mounted once in `Layout`; its `visible` state can only turn `false` via the explicit dismiss button (`clearBlockedNotice()` does not dispatch the change event). Therefore a banner "flash" on SPA navigation cannot be produced by the banner itself. Two real defects produce the observed symptom:

- The notice flag (`auth.blockedNotice`) set by a rejected sign-in is never removed when the user later authenticates successfully. `AuthContext` writes the flag in three places (rejected email sign-in, rejected Google sign-in, live-termination snapshot) but nothing clears it — the banner keeps haunting the tab.
- `AppAdminPanel`'s guard (`!isAuthenticated || user?.role !== 'admin'`) is evaluated while `authReady`/profile query are still resolving, so a full page load of `/app-admin` shows the localized `alert-warning` (visually identical to the blocked-notice banner) for the loading period. `UserEditForm` has the same latent issue on `/users/:id/edit`.

## Goals / Non-Goals

- Goals: stale notice flag cleared once an active profile is loaded; loading states render spinners, not access verdicts.
- Non-Goals: changing the banner component or its event design; adding server-side rules for settings; reworking the profile query.

## Decisions

### Decision 1: Clear the flag in the profile query's success path
`AuthContext`'s profile `useQuery` is the single point through which every authentication path flows (Firebase session restore, email sign-in, Google sign-in — the sign-in callbacks even seed this cache). When the query resolves with an existing profile that is not blocked (`!isUserBlocked(profile)`), `clearBlockedNotice()` runs. A blocked profile keeps the flag so the banner remains. Clearing in the query — rather than in each sign-in callback — also covers restored sessions where `signIn` is never called.

*Alternative considered:* clearing in `signIn`/`signInGoogle` success paths only — rejected: misses the Firebase-restored-session path.

### Decision 2: Guard components render a spinner while `isLoading`
`useAuth` exposes `isLoading` (`!authReady || isProfileLoading`). `AppAdminPanel` and `UserEditForm` split their guard into three states: loading → centered spinner; loaded non-admin → access alert; loaded admin → content. This removes the warning-alert flash on full page loads and keeps the verdict correct once data is known.

### Decision 3: Repair the `app-administration` main spec during this change's sync
The main spec's Cyrillic text was corrupted by a console-encoding accident during its earlier sync; the archived delta is intact. The sync of this change regenerates the main spec from the intact archive delta with the modified access requirement applied.

## Risks / Trade-offs

- **[Query-level clearing runs on every profile load]** Idempotent (`sessionStorage.removeItem` on a missing key is a no-op); no behavioral risk.
- **[A signed-in active user loses the notice intentionally]** The notice documents a rejection/termination; once the user is demonstrably active again the message is obsolete — this is the intended lifecycle.

## Migration Plan

Pure client-side fix; no data, rules, or index migrations.
