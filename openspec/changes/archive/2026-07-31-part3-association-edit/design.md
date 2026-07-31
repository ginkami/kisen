## Context

The association edit form's manager invitation by email relies on `UserService.getByEmail()`, which queries the `users` collection. However, Firestore rules currently restrict user profile reads to the profile owner and admins (`allow read: if isAuthenticated() && (currentUserId() == userId || isAdmin())`). This means `getByEmail()` silently returns null for non-admin users, causing all email invites to fall into `pendingInvites` instead of resolving to existing user ids. Additionally, invited managers have no way to remove themselves from managing an association.

## Goals / Non-Goals

**Goals:**
- Fix manager invitation by email to correctly resolve to existing user ids.
- Allow invited managers to remove themselves from the managers list.
- Protect sensitive user data (auth field) when broadening read access.

**Non-Goals:**
- Changing the overall user authentication/authorization model.
- Adding a manager acceptance/decline flow for pending invites.
- Modifying the association schema.

## Decisions

### Decision 1: Open user profile reads to all authenticated users

Change Firestore rules for `/users/{userId}` from:
```
allow read: if isAuthenticated() && (currentUserId() == userId || isAdmin());
```
to:
```
allow read: if isAuthenticated();
```

This allows `getByEmail()`, `searchByFamilyName()`, and `getUserById()` to work for all authenticated users. The risk of exposing user profiles is mitigated by Decision 2 (stripping auth field).

### Decision 2: Strip auth field from UserService responses

All functions that return `User` objects (`getUserById`, `getByEmail`, `searchByFamilyName`, `getByIds`) currently include the full `auth` field containing `passwordHash`, `providers`, `emailVerified`, and `isActive`. Add a `toPublicUser()` helper that maps `FirestoreUser` → `User` without the `auth` field, or with a minimal `auth` containing only safe fields. All read functions will use this helper.

The `User` type in `src/types/user.ts` will be updated to make `auth` optional (or a new `PublicUser` type will be introduced). Since `auth` is currently used in `AuthContext` for the current user's profile, we keep it in `createUser` and `AuthContext` but strip it from search/get results.

### Decision 3: Manager self-removal

In `AssociationManagersSection`, update the remove button visibility logic:
- **admin** or **creator**: can remove any manager and any pending invite (existing behavior)
- **invited manager** (current user's id is in `managers`): can remove only their own badge from `managers`

Implementation: show remove button on a manager badge if `canRemove || (profile.id === currentUser?.id)`.

## Risks / Trade-offs

- **[Broader user profile reads]** — All authenticated users can now read any user profile. Mitigated by stripping the `auth` field (no password hashes, no provider details exposed).
- **[Manager self-removal]** — An invited manager can leave at any time. This is intentional per the requirement.