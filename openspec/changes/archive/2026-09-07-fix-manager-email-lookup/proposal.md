# Fix manager email lookup

## Why

On the association edit page the manager invite input (`ManagerInviteInput`) does not search users by email: when a full email is typed, the dropdown only shows a «пригласить по email» candidate card, and the actual `getByEmail` lookup runs only after the user clicks «Выбрать». A registered user is therefore never visible before selection, and there is no way to tell an existing user from a pending invite. Two related defects make this worse:

1. `isEmailMode` is computed at render time from `inputValue`, but `handleInputChange` closes over the previous render's value (one-keystroke lag). Typing `@` still triggers a wasted family-name Firestore query with the `@` included and flashes «Пользователи не найдены».
2. `createUser` stores the email as-is while `getByEmail` queries `email == email.toLowerCase()`. A profile created with an uppercase email can never be found by the exact case-insensitive lookup.
3. A typo'd but syntactically valid email (`example@gmail.co`) gets a one-click «Выбрать» card, so an accidental click silently adds a pending invite nobody will ever receive.
4. The email-lookup path does not filter results by `excludeUserIds`, so the association creator can be added as a manager via their email (the family-name path is filtered, the email path was not).

## What Changes

- **ManagerInviteInput**: on a valid full email (not already in `pendingInvites`), look the user up via `getByEmail(email.toLowerCase())` and show the registered user as a result card (with localized name and «Выбрать») before any selection. Remove the stale render-time `isEmailMode` — branch on `value.includes('@')` inside the handler. Validate emails with the same domain rule as `associationSchema` (shared `emailSchema`): incomplete emails (e.g. a one-letter TLD like `test@site.b`) never trigger a lookup and can never be added as a pending invite. When no user matches, show the «no users found» message with an explicit «Пригласить по email» action instead of a one-click «Выбрать» card, so a typo'd email (e.g. `gmail.co`) is not added accidentally. Never offer users from `excludeUserIds` (the association creator or already-added managers): filter the email-lookup result like the family-name path and guard both select handlers.
- **userService.createUser**: store `email` lowercased so the case-insensitive lookup works for all new profiles (no migration of existing documents).
- **domain**: export shared `emailSchema` (`z.string().email()`) from `src/domain/association.ts` and reuse it for `pendingInvites` and the invite input.

## Impact

- Affected specs: `association-management` (MODIFIED: «Manager invite input with dual-mode autocomplete», «User service search methods»)
- Affected code: `src/components/association/ManagerInviteInput.tsx`, `src/services/userService.ts`
- New tests: `src/test/managerInviteInput.test.tsx`
