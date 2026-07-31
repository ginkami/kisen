## 1. Firestore rules

- [x] 1.1 In `firestore.rules`, change `/users/{userId}` `allow read` to `isAuthenticated()`.

## 2. UserService

- [x] 2.1 In `src/services/userService.ts`, add a `toPublicUser()` helper that strips the `auth` field from `FirestoreUser` → `User`.
- [x] 2.2 Apply `toPublicUser()` in `getUserById`, `getByEmail`, `searchByFamilyName`, `getByIds`.

## 3. Manager self-removal

- [x] 3.1 In `src/components/association/AssociationManagersSection.tsx`, show remove button on a manager badge if `canRemove || profile.id === currentUser?.id`.

## 4. Spec update

- [x] 4.1 Update `openspec/specs/association-management/spec.md`: sync delta spec changes (Manager management section — self-removal scenario, User service — exclude auth, Firestore rules — open read).

## 5. Verification

- [x] 5.1 Run `npx tsc -b --noEmit` and resolve any type errors.
