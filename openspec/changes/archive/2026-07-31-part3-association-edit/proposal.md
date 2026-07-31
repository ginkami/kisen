## Why

Manager invitation by email in the association edit form is broken: when a user with the given email already exists, the email is still stored in `pendingInvites` instead of the user's id being added to `managers`. The root cause is that Firestore rules restrict user profile reads to the profile owner and admins, so `getByEmail()` fails silently and falls back to `pendingInvites`. Additionally, invited managers cannot remove themselves from managing an association — only admins and the creator can remove managers.

## What Changes

- **Firestore rules**: change user profile `allow read` to `isAuthenticated()` so all authenticated users can search/list other users.
- **UserService**: exclude the `auth` field (passwordHash, providers, emailVerified, isActive) from all returned `User` objects to avoid leaking sensitive data now that profiles are more broadly readable.
- **AssociationManagersSection**: allow an invited manager to remove themselves from the `managers` array (but not remove other managers or pending invites).
- **Spec**: update the "Manager management section" requirement — add self-removal scenario, update the "invited manager cannot remove others" scenario.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `association-management`: fix manager invitation by email, add manager self-removal.

## Impact

- **Code**:
  - Modified: `firestore.rules` (user read permissions), `src/services/userService.ts` (exclude auth field), `src/components/association/AssociationManagersSection.tsx` (self-removal logic).
- **Specs**: updated `openspec/specs/association-management/spec.md`.
- **Dependencies**: none.