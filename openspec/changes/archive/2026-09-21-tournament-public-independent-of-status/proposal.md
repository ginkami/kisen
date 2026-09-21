## Why

`isPublic` currently is not an independent property: `TournamentService.update()` derives it from the status (`status !== 'draft' && status !== 'proposed_for_removing'`), the Firestore rules enforce the same invariant (`isValidPublicStatus`), and the domain schema forbids a published tournament with draft status. Because of this coupling an unpublished tournament cannot be visible on the site, and the pairing-assistant drawer (`PairingToolsDrawer`) plus the whole "run the tournament" workflow is restricted to `status === 'ongoing'`.

Product decision: `isPublic` SHALL only mean "the tournament is visible on the site" and MAY be `true` for any status, including `draft`. Unpublished tournaments SHALL be fully runnable (pairings, drawer, publishing draws) without status restrictions. The edit form needs a «Скрыть» / "Unpublish" action that takes a tournament off publication (`isPublic = false`) and alternates with «Опубликовать».

## What Changes

- **Service (`src/services/tournamentService.ts`)**: `UpdateTournamentInput` gains an optional `isPublic`. `update()` no longer derives `isPublic` from the status — it uses `input.isPublic` when provided, otherwise keeps the stored value. `publish()` explicitly sets `isPublic: true`. New `unpublish(id, existing?)` service method sets `isPublic: false` without touching the status.
- **Domain (`src/domain/tournament.ts`)**: remove the `publishedTournamentSchema` refine "Published tournament cannot have draft status".
- **Firestore rules (`firestore.rules`)**: remove the `isValidPublicStatus()` function and its use in tournament create/update conditions (the `isPublic`↔`status` invariant no longer exists).
- **Form hook (`src/hooks/useTournamentForm.ts`)**: new `unpublishMutation` + `unpublish()` action (with `isUnpublishing`, `unpublishError`, `clearUnpublishError`); the publish path is unchanged except it now relies on the service to set `isPublic: true`.
- **Edit form UI (`src/components/tournament/TournamentEditForm.tsx`)**:
  - «Опубликовать» is shown whenever `!tournament.isPublic` (any status), «Скрыть» / "Unpublish" is shown whenever `tournament.isPublic`; both sit between «Сохранить» and «Удалить», the hide action asks for confirmation.
  - `pairingToolsAvailable` no longer requires `status === 'ongoing'` — the pairing tools drawer is available on the Pairings/Crosstable tabs for a tournament of any status.
- **i18n (`src/locales/{ru,en}/translation.json`)**: `tournament.edit.unpublish` («Скрыть» / "Unpublish"), confirmation title/message, error key.
- **Tests**: service tests for explicit `isPublic` control and `unpublish()`; edit-form tests for drawer availability at any status and for the publish/unpublish button alternation driven by `isPublic`.

Spec deltas: `tournament-management` — MODIFIED "Tournament status lifecycle" and "Pairing tools drawer availability", ADDED "Unpublish (Скрыть) button in the edit form header". Other capabilities (public pages, home board) keep filtering by `isPublic`/status and are unchanged.

## Impact

- Affected specs: `openspec/specs/tournament-management/spec.md` (two modified requirements, one new requirement).
- Affected code: `src/services/tournamentService.ts`, `src/domain/tournament.ts`, `firestore.rules`, `src/hooks/useTournamentForm.ts`, `src/components/tournament/TournamentEditForm.tsx`, `src/locales/ru/translation.json`, `src/locales/en/translation.json`, plus unit/component tests under `src/`.
- No data migration: existing documents keep their stored `isPublic`; the flag simply stops being recomputed.
