## Context

The tournament edit page currently sets a plain page title via `t('tournament.edit.pageTitle', { title })`, renders the admin drawer on the right, and uses native `window.confirm` for destructive/lossy actions. We want to align these interactions with the rest of the daisyUI admin interface.

## Goals / Non-Goals

**Goals:**
- Format the browser tab title as `{title} — {managementPanel} | shogi·world` and keep it reactive while editing.
- Move the admin drawer and its toggle button to the left side.
- Replace `Cog8ToothIcon` with `TrophyIcon` in the drawer header and toggle button.
- Provide a reusable daisyUI confirmation modal and use it for every current `window.confirm` call.

**Non-Goals:**
- Changing drawer content, width, or behavior beyond left/right positioning and icon.
- Replacing `window.alert` (not currently used).
- Adding new business rules or backend validation.

## Decisions

- **Tab title via i18n template**: Use `t('tournament.edit.pageTitle', { title, managementPanel })` with updated locale values containing `{{title}}`, `{{managementPanel}}`, and the literal `| shogi·world`. This keeps the brand suffix consistent and avoids hard-coding it in a component.
- **Left drawer with CSS transforms**: Keep the existing fixed panel approach but flip `right-0`/`translate-x-full` to `left-0`/`-translate-x-full`. The push spacer in `Layout` is placed before `<main>` instead of after it.
- **Single reusable modal**: Create `ConfirmModal.tsx` controlled by props (`isOpen`, `title`, `message`, `confirmText`, `cancelText`, `variant`, `onConfirm`, `onCancel`). Use daisyUI `dialog.modal` classes so it matches the theme and blocks interaction with the page.
- **Async confirmation callbacks**: Convert each synchronous `window.confirm` site to a local modal state plus a callback. For navigation cases (`AdminDrawer`, `NewTournamentButton`), store the pending target path/action in a ref or state variable and execute it after the user confirms.

## Risks / Trade-offs

- [Risk] The drawer auto-open effect in `Layout.tsx` currently sets state inside an effect, which already triggers lint warnings. Moving the drawer to the left does not fix this, but it also does not make it worse.
  → Mitigation: keep the existing auto-open logic untouched; address the effect warning separately.
- [Risk] Replacing `window.confirm` with a React modal requires extra state in three components.
  → Mitigation: keep the modal state local and simple; avoid premature abstraction beyond the reusable presentational component.
