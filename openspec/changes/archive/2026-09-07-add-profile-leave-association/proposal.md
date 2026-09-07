# Add leave association management from profile page

## Why

A user who was added to an association's `managers` can only be removed by someone else (the creator, another manager, or an admin) from the association edit page. There is no way for the user to leave the management of an association they no longer work with. The profile page already lists all managed associations as badges, so it is the natural place for a self-removal action. Deleting an association the user created from the profile page is explicitly out of scope: the creator must manage (or delete) their association from the association edit page.

## What Changes

- **ProfileEditForm**: associations the user manages but did not create get a «×» button on their badge. Clicking it opens the shared `ConfirmModal` (`variant="error"`) warning that the user will be removed from the association's management and can only return via a new invite. Confirming calls `associationService.update` with the user removed from `managers` (passing `existing` to avoid an extra fetch) and invalidates the `['associations', 'my', userId]` query so the badge disappears. A failed update shows an error alert (same pattern as the existing save-error alert). Creator badges have no «×» button.
- **i18n**: new keys under `profile.edit.associations` (`leaveConfirmTitle`, `leaveConfirm`, `errors.leave`) in both `ru` and `en`; confirm/cancel buttons reuse `common.confirm` / `common.cancel`.
- No Firestore security-rules changes are needed: `isManagerOf(associationId)` already grants a manager update access to the association document, and `associationSchema` allows an empty `managers` array (so leaving as the last manager works).

## Impact

- Affected specs: `profile-page` (MODIFIED: «Managed associations shortcuts»)
- Affected code: `src/components/profile/ProfileEditForm.tsx`
- Affected translations: `src/locales/ru/translation.json`, `src/locales/en/translation.json`
- New tests: scenarios in `src/test/profilePage.test.tsx`
