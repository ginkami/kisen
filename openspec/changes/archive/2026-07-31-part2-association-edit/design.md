## Context

The association edit page (`/assn/:id/edit` and `/assn/new`) currently shows a placeholder. The domain model (`associationSchema`) supports `slug`, `locales` (title/description/location), `country`, `managers`, `pendingInvites`, and `createdBy`. The repository has basic CRUD (`create`, `update`, `delete`), but the service layer doesn't expose them, and there are no form components or user-search capabilities.

## Goals / Non-Goals

**Goals:**
- Full association edit form: title, slug, description, country, location (locale-aware).
- Save/delete with validation and confirm.
- Manager management: invite by user name or email, remove with role-based permissions.
- Service-layer CRUD and user-search methods.
- Firestore rules aligned with the permission model.

**Non-Goals:**
- Public association pages (slug-based read-only views) — future work.
- Manager acceptance/decline flow for pending invites — future work.
- Changing the association schema or domain model.

## Decisions

### Decision 1: Service CRUD methods

Add to `AssociationService`:
- `create(input: CreateAssociationInput): Promise<Association>` — generates uuidv7 id, validates via `associationSchema.parse`, calls `repository.create`.
- `update(input: UpdateAssociationInput): Promise<Association>` — merges with existing, validates, calls `repository.update`.
- `delete(id: string): Promise<void>` — calls `repository.delete`.
- `slugExists(slug: string): Promise<boolean>` — queries `where('slug', '==', slug)` excluding current id.

### Decision 2: UserService search methods

Add to `UserService` (new class or extend existing functions):
- `searchByFamilyName(prefix: string): Promise<User[]>` — parallel range query on `locales.ru.familyName` and `locales.en.familyName` (same pattern as player search), cap at 20.
- `getByEmail(email: string): Promise<User | null>` — exact match `where('email', '==', email.toLowerCase())`.
- `getByIds(ids: string[]): Promise<User[]>` — batch `getDoc` per id (no `in` query needed for small arrays).

### Decision 3: `useAssociationForm` hook

Follows `useTournamentForm` / `usePlayerForm` patterns:
- `useQuery` for loading existing association.
- `useState` for `AssociationFormState` (slug, locales, country, managers, pendingInvites).
- `useMutation` for save (create or update) and delete.
- Dirty tracking via `JSON.stringify` snapshot.
- `validationErrors` for title (required) and slug (required, unique).
- `setHasUnsavedChanges` via outlet context.
- Loads manager profiles via `getByIds(managers)` for display.

### Decision 4: Manager invite dual-mode autocomplete

`ManagerInviteInput` component:
- Text input with placeholder «Введите фамилию пользователя или email».
- **Mode A** (no `@`, >3 chars): search users by familyName → show result cards with «Выбрать» button.
- **Mode B** (contains `@`): validate email → if valid, show single card with email and «Выбрать» button.
- **On select**: 
  - If userId known → `managers.push(userId)`.
  - If email → `getByEmail(email)` → found → `managers.push(id)`, not found → `pendingInvites.push(email)`.

### Decision 5: Manager removal permissions

- `createdBy` badge: no remove button (creator cannot be removed).
- `managers` badges: remove button visible only if current user is `admin` or `createdBy === currentUid`. Invited managers (role `user`) cannot remove anyone.
- `pendingInvites` badges: remove button visible only if `admin` or `createdBy`.

### Decision 6: Firestore rules update

```
match /associations/{associationId} {
  allow read: if true;
  allow create: if isAdmin() || isAuthenticated();
  allow update: if isAdmin() || isCreatorOf(associationId) || isManagerOf(associationId);
  allow delete: if isAdmin() || isCreatorOf(associationId);
}
```
Where `isCreatorOf(id)` checks `createdBy === currentUserId()`.

Managers and admins can create unlimited associations (no count limit).

## Risks / Trade-offs

- **[User search across locales]** — 2 parallel queries per search; acceptable (same pattern as players).
- **[Pending invite acceptance]** — Not implemented in this change; pending invites are just stored as emails. Future change will handle what happens when a user with that email registers.