## 1. Browser tab title

- [x] 1.1 Update `src/locales/ru/translation.json` and `src/locales/en/translation.json` so `tournament.edit.pageTitle` uses the template `{{title}} — {{managementPanel}} | shogi·world`.
- [x] 1.2 In `src/components/tournament/TournamentEditForm.tsx`, set `document.title` via `t('tournament.edit.pageTitle', { title: localizedTitle, managementPanel: t('tournament.edit.managementPanel') })`.
- [x] 1.3 Verify the tab title updates reactively as the tournament title changes.

## 2. Move admin drawer to the left

- [x] 2.1 In `src/components/Layout.tsx`, move `<AdminDrawer />` before `<main>` and move the sticky toggle button to the left side (`left-0`, `rounded-r-box`).
- [x] 2.2 In `src/components/AdminDrawer.tsx`, change the drawer panel from `right-0`/`translate-x-full` to `left-0`/`-translate-x-full`.
- [x] 2.3 In `src/components/AdminDrawer.tsx`, invert the swipe-to-close direction.
- [x] 2.4 Replace `TrophyIcon` with `Cog8ToothIcon` from `@heroicons/react/24/outline` in both the drawer header and the sticky toggle button.

## 3. Replace window.confirm with custom modal

- [x] 3.1 Create `src/components/ConfirmModal.tsx` using daisyUI `dialog.modal` classes with title, message, confirm/cancel buttons, and `variant` support.
- [x] 3.2 Add i18n keys for modal titles, messages, and buttons (`common.confirm`, `common.cancel`, `tournament.edit.publishConfirmTitle`, `tournament.edit.deleteConfirmTitle`, `admin.unsavedChangesConfirmTitle`, etc.) in both locale files.
- [x] 3.3 Replace `window.confirm` in `src/components/tournament/TournamentEditForm.tsx` (publish and delete) with `ConfirmModal`.
- [x] 3.4 Replace `window.confirm` in `src/components/AdminDrawer.tsx` (navigation with unsaved changes) with `ConfirmModal`.
- [x] 3.5 Replace `window.confirm` in `src/components/NewTournamentButton.tsx` (new tournament with unsaved changes) with `ConfirmModal`.

## 4. Verification

- [x] 4.1 Run `npm run build` and confirm it succeeds.
- [x] 4.2 Run `npx vitest run` and confirm all tests pass.
- [x] 4.3 Run `npm run lint` and fix any new errors introduced by these changes.
