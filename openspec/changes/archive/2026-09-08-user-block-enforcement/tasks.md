## 1. Client profile exposure

- [x] 1.1 `userService.toPublicUser`: map the `auth` field so `user.auth.isActive` reaches the client
- [x] 1.2 `userService.searchByFamilyName`: filter out users with `auth?.isActive === false`

## 2. AuthContext enforcement

- [x] 2.1 Add `isUserBlocked(profile)` (`auth?.isActive === false`) and block both `signIn` and `signInGoogle`: `logOut()`, cache clear, localized thrown error
- [x] 2.2 Add an `onSnapshot` listener on `users/{uid}` while signed in: on `auth.isActive === false` вЂ” `logOut()`, cache clear, store the `auth.blockedNotice` sessionStorage flag; cache-sourced snapshots are ignored so a stale flag cannot block re-login

## 3. Notice banner and invite search UX

- [x] 3.1 New `BlockedNoticeBanner` component (sessionStorage flag, localized text, dismissible) rendered in `Layout`
- [x] 3.2 No code change needed in `ManagerInviteInput` вЂ” the service filter covers it (verify)

## 4. Firestore rules

- [x] 4.1 Add the `isUserActive()` helper
- [x] 4.2 Gate all write rules for associations, players, tournaments, events, regulations with `isUserActive()` (correct parenthesization of existing disjunctions)
- [x] 4.3 Users `update`: require `isUserActive()` and protect `auth.isActive` from non-admin changes

## 5. Locales

- [x] 5.1 Add `auth.errors.userBlocked` to `src/locales/ru/translation.json` and `src/locales/en/translation.json`

## 6. Tests

- [x] 6.1 Add `src/test/userBlocking.test.tsx` (mocks: `authService`, `userService`, `firebase/auth`, `firebase/firestore`): blocked sign-in в†’ `logOut` + localized error; active sign-in succeeds; blocked snapshot в†’ forced `logOut` + sessionStorage flag
- [x] 6.2 Add `src/test/userServiceActiveFilter.test.ts` (mocked `firebase/firestore`): `searchByFamilyName` excludes blocked users, keeps legacy users

## 7. Validation

- [x] 7.1 `npx tsc -b` passes
- [x] 7.2 `npx vitest run` all green (579 + new)
- [x] 7.3 `npx vite build` succeeds
- [x] 7.4 `openspec validate user-block-enforcement` passes
- [x] 7.5 Note: rules require `firebase deploy --only firestore:rules` (manual step)