## Why

The tournament edit page currently uses a generic browser tab title, a right-side admin drawer that conflicts with common left-navigation expectations, and native `window.confirm` dialogs that break the daisyUI visual consistency. These three small UX issues make the admin interface feel less polished and harder to use.

## What Changes

- Update the browser tab title on the tournament edit page to `{{title}} — {{managementPanel}} | shogi·world`, where `title` comes from the active locale. The title updates reactively as the user edits the tournament name.
- Move the admin drawer from the right edge to the left edge of the screen, including the sticky toggle button and the drawer panel itself. Replace the `TrophyIcon` with `Cog8ToothIcon` (outline) in both places.
- Replace all `window.confirm` calls with a custom daisyUI modal component. Affected flows: publishing a tournament, deleting a tournament, navigating away from an unsaved tournament in the admin drawer, and creating a new tournament from the header/drawer while unsaved changes exist.

## Capabilities

### New Capabilities

- `tournament-edit-browser-title`: Browser tab title formatting for the tournament edit page.
- `admin-drawer-left-side`: Left-side admin drawer layout and toggle button styling.
- `custom-confirmation-modal`: Reusable daisyUI confirmation modal used instead of `window.confirm`.

### Modified Capabilities

- None. This is a pure UI/UX change; no domain requirements or spec-level behavior change.

## Impact

- Affected components: `Layout.tsx`, `AdminDrawer.tsx`, `TournamentEditForm.tsx`, `NewTournamentButton.tsx`, and a new `ConfirmModal.tsx` component.
- Affected translation keys: `tournament.edit.pageTitle`, plus new keys for modal titles/messages/buttons.
- No Firestore schema, security rules, or backend service changes required.

## Non-goals

- Replacing `window.alert` (none are currently used).
- Changing drawer width, animation duration, or accordion content.
- Persisting tab title preferences.
