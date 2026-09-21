## 1. Domain and service

- [x] 1.1 In `src/domain/tournament.ts`, remove the `publishedTournamentSchema` refine (`t.status !== 'draft'`, "Published tournament cannot have draft status").
- [x] 1.2 In `src/services/tournamentService.ts`, add `isPublic?: boolean` to `UpdateTournamentInput`.
- [x] 1.3 In `update()`, replace the derived `isPublic` (`nextStatus !== 'draft' && nextStatus !== 'proposed_for_removing'`) with `input.isPublic !== undefined ? input.isPublic : existing.isPublic`.
- [x] 1.4 Change `publish()` to `update({ id, status: 'upcoming', isPublic: true, existing })`.
- [x] 1.5 Add `unpublish(id: string, existing?: Tournament)` → `update({ id, isPublic: false, existing })`.

## 2. Firestore rules

- [x] 2.1 In `firestore.rules`, remove the `isValidPublicStatus()` function and drop it from the tournament `create`/`update` conditions.

## 3. Form hook

- [x] 3.1 In `src/hooks/useTournamentForm.ts`, add `unpublishMutation` calling `tournamentService.unpublish(tournament.id, tournament)`; onSuccess mirrors `publishMutation` (query cache update, list invalidations, formState refresh, `unpublishError` reset).
- [x] 3.2 Expose `unpublish`, `isUnpublishing`, `unpublishError`, `clearUnpublishError` from the hook return.

## 4. Edit form UI

- [x] 4.1 In `src/components/tournament/TournamentEditForm.tsx`, change the «Опубликовать» button condition from `tournament?.status === 'draft'` to `!tournament?.isPublic`.
- [x] 4.2 Add the «Скрыть» / "Unpublish" button rendered when `tournament?.isPublic`, between «Сохранить» and «Удалить», disabled while save/publish/unpublish/delete is in flight; confirm modal type `'unpublish'` with localized title/message; error alert for `unpublishError` with a close button.
- [x] 4.3 Drop the `tournament?.status === 'ongoing'` condition from `pairingToolsAvailable`.

## 5. i18n

- [x] 5.1 Add `tournament.edit.unpublish` («Скрыть» / "Unpublish"), `unpublishConfirmTitle`, `unpublishConfirm`, and the unpublish error message key to `src/locales/ru/translation.json` and `src/locales/en/translation.json`.

## 6. Tests and verification

- [x] 6.1 Update `src/services/tournamentService.test.ts`: draft with `isPublic: true` persists through update; update without `isPublic` keeps the stored value; `unpublish()` sets `isPublic: false` and keeps the status; `publish()` sets `isPublic: true`.
- [x] 6.2 Update `src/test/tournamentEditFormAccess.test.tsx`: pairing tools are available for a non-`ongoing` tournament; publish/unpublish header buttons alternate by `isPublic` (hidden `upcoming` tournament shows «Опубликовать», public one shows «Скрыть»).
- [x] 6.3 Review and fix remaining fixtures relying on derived `isPublic` — no additional fixtures needed; the full suite passes unchanged.
- [x] 6.4 Run type check, lint, and the full vitest suite; fix regressions (tsc: clean; eslint: clean; vitest: 71 files / 797 tests passed).

