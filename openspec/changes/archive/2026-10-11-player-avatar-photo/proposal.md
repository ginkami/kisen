# Proposal

## Why

Players have no photo: tournament admins and association managers cannot visually identify participants in the edit form, on pairings/printouts, or in lists. A stored avatar gives the player entity a face while keeping the data model minimal (a single bytes field).

## What Changes

- Add an optional `avatar` field (JPEG bytes, 700×700, quality 77) to the `Player` domain model, service inputs, and Firestore persistence.
- Replace the `{/* Место для фото */}` placeholder in `PlayerInfoSection` with a photo block: label «Фотография» / "Photo", a 200×200 preview when an avatar exists, and an add/change button («Добавить» / «Изменить») plus a delete button («Удалить») when one exists.
- The add/change button opens a file picker (jpg/png/webp) and also accepts drag-and-drop on the button; images whose shortest side is below 700px are rejected with a localized notification.
- After a file is chosen, a crop modal shows the image inside a square frame with drag-to-pan and `BsZoomIn`/`BsZoomOut` zoom controls (zoom is limited so the selected square always covers at least 700px of the source image); «Применить» encodes the selected 700×700 area as JPEG via `@jsquash/jpeg` (quality 77) into the form's `avatar` field.
- Avatar changes are form state: they persist only when the form is saved (Save/Confirm); «Удалить» clears the form field without confirmation (reversible until save).
- Binary-safety fixes so `Uint8Array`/Firestore `Bytes` survive `sanitizeDeep` and the `timestampsToDates`/`datesToTimestamps` repository helpers.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `player-management`: new requirement «Player photo (avatar)» — domain/service/repository field, the photo block in `PlayerInfoSection` (add/change/delete + file picker + DnD + min-size validation), and the crop modal behavior (drag, zoom limits, `@jsquash/jpeg` encode).

## Impact

- **Domain/persistence**: `src/domain/player.ts`, `src/services/playerService.ts` (`CreatePlayerInput`/`UpdatePlayerInput`), `src/services/firestorePlayerRepository.ts` (Bytes ↔ Uint8Array), `src/utils/sanitize.ts` (`sanitizeDeep` binary pass-through), `src/services/firestoreHelpers.ts` (binary pass-through in the timestamp converters).
- **Form**: `src/hooks/playerFormHelpers.ts` (`avatar` in `PlayerFormState` + create/update converters), `src/hooks/usePlayerForm.ts` and `src/components/player/PlayerEditModal.tsx` (binary-safe JSON snapshots for dirty tracking), `src/components/player/PlayerInfoSection.tsx`.
- **New components**: photo crop modal (`src/components/player/…`) and a pure crop-math helper.
- **Dependencies**: `@jsquash/jpeg` (WASM JPEG encoder; requires Vite asset/wasm handling verification).
- **i18n**: new `player.edit.*` keys in `src/locales/ru/translation.json` and `src/locales/en/translation.json`.
- **Docs/schemas**: `schemas/player.jsonс` JSONC spec; `firestore.rules` review (no change expected — player `update` already permits editor-owned field writes).
- **Tests**: new unit tests for crop math, validation, binary-safe helpers, form converters; component tests for the photo block and crop modal (mocked `@jsquash/jpeg`/canvas); existing tests unaffected (field is optional).
