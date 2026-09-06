## 1. Service and hook

- [x] 1.1 In `src/services/userService.ts`, add `updateUser(id: string, input: { locales?: UserLocales; auth?: User['auth'] }): Promise<User>` — `updateDoc` with `updatedAt: serverTimestamp()`, then return the re-read user.
- [x] 1.2 Create `src/hooks/useProfileForm.ts`: locales form state from `useAuth().user`, `updateLocale`, `isDirty` (deep compare with loaded locales), `save` (calls `updateUser`, refreshes `['authUser', uid]` cache), `isSaving`, `saveError`, `clearSaveError`.

## 2. UI components

- [x] 2.1 Create `src/components/profile/PasswordSection.tsx`: mode from `firebaseUser.providerData` (password provider present → change mode), fields per mode, inline validation (old required, min 6, repeat match), own apply button, Firebase calls (`reauthenticateWithCredential` + `updatePassword` / `linkWithCredential` + `reload()` + Firestore `auth.providers` sync), localized error mapping.
- [x] 2.2 Create `src/components/profile/ProfileEditForm.tsx`: header (over-title, live h1, Save disabled when clean, Delete always disabled), unnamed immutable section (Email + localized Role, `sm:grid-cols-2`), «Профильные данные» card with `LocaleTabs` and three fields, «Провайдеры аутентификации» card with provider badges + `PasswordSection`, «Ассоциации, которыми управляете» card with link badges (creator mark via `association.createdBy === uid`, reuse `association.edit.creator`), `document.title` pattern.

## 3. Page wiring, cleanup, i18n

- [x] 3.1 Replace `src/pages/ProfilePage.tsx` placeholder: auth guard (`Navigate to /login`), loading spinner, `<ProfileEditForm key={user.id} />`.
- [x] 3.2 Delete the unused `src/components/UserProfile.tsx`.
- [x] 3.3 Add `profile.edit.*` i18n keys in `src/locales/ru/translation.json` and `src/locales/en/translation.json`; remove `profile.placeholder`.

## 4. Tests

- [x] 4.1 Create `src/test/profilePage.test.tsx` (mock `react-i18next`, `AuthContext`, `firebase/auth`, `userService`, `useAssociations`): redirect when unauthenticated; header (over-title, h1 from locales, document.title, Delete disabled); immutable Email/Role; Save gating (disabled → enabled after edit → `updateUser` called); locale switching; providers badges and password mode switching (change vs add); password validation (mismatch, short, missing old) and Firebase error mapping; associations badges (creator mark + link, manager badge, empty hint).

## 5. Verification

- [x] 5.1 Run `npx tsc -b`, `npx vitest run`, `npx vite build` — all green.
- [x] 5.2 Run `openspec validate add-profile-page` — passes.
