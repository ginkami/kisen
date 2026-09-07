## 1. Manager invite input

- [x] 1.1 `ManagerInviteInput`: on a valid full email, look up the user via `getByEmail(email.toLowerCase())` and show the registered user as a result card before selection; keep the email candidate card only when no user matches
- [x] 1.2 `ManagerInviteInput`: branch on `value.includes('@')` inside `handleInputChange` (and `inputValue.includes('@')` in `onFocus`) instead of the stale render-time `isEmailMode`, so typing `@` no longer triggers a family-name search
- [x] 1.3 `userService.createUser`: store `email` lowercased
- [x] 1.4 Strict email validation aligned with the domain schema: export `emailSchema` from `src/domain/association.ts`, reuse it for `pendingInvites` and in `ManagerInviteInput` so incomplete emails (e.g. one-letter TLD) never trigger a lookup or get added; suppress the «no users found» message while typing a partial email
- [x] 1.5 Two-step email invite: when `getByEmail` finds no user, show the «no users found» message with an explicit «Пригласить по email» button (new `association.edit.inviteByEmail` key in ru/en) instead of a one-click «Выбрать» card, so a typo'd email is not added accidentally; the button still re-validates and re-checks `getByEmail` before adding
- [x] 1.6 Never offer the association creator or an already-added manager: filter the email-lookup result by `excludeUserIds` (previously only the family-name path was filtered) and guard `handleSelectUser`/`handleSelectEmail`; an excluded user shows the «no users found» message with no actions

## 2. Tests

- [x] 2.1 New `src/test/managerInviteInput.test.tsx`: registered user shown for a full email before selection; pending invite for an unknown email; excluded (already invited) email is not offered; incomplete email triggers no lookups; family-name search still works without `@`
- [x] 2.2 Regression tests for strict validation: one-letter TLD (`test@site.b`) — no lookup, no candidate, no «no users found»; unusual but valid multi-letter TLD (`test@site.bjkjkj`) — offered as expected
- [x] 2.3 Tests for the two-step invite (message + «Пригласить по email» button) and for creator/already-added-manager exclusion via email (no card, no actions, message shown)

## 3. Verification

- [x] 3.1 `npx tsc -b` passes; `npx vitest run` passes (except the pre-existing flaky `tournamentResultsSection` test)

