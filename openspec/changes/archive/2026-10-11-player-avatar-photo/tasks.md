# Tasks

## 1. Setup and specs

- [x] 1.1 Install `@jsquash/jpeg@^1.6.0` and verify it is listed in `package.json` dependencies and `npm ls @jsquash/jpeg` resolves
- [x] 1.2 Document the optional `avatar` field in `schemas/player.jsonс` and verify the JSONC file still parses as valid JSONC (commented structure intact)
- [x] 1.3 Review `firestore.rules` players block for avatar writes and verify the `update` rule has no field whitelist (no change expected; if a change is made, re-read it to confirm it allows the avatar field for editor roles)

## 2. Domain and persistence (binary-safe)

- [x] 2.1 Add `avatar: z.custom<Uint8Array>(…)` to `playerSchema` in `src/domain/player.ts` and verify with unit tests (`src/test/playerAvatar.test.ts`): player without avatar parses, with `Uint8Array` parses, with a plain object/string fails
- [x] 2.2 Extend `CreatePlayerInput`/`UpdatePlayerInput` and `PlayerService.create`/`update` to carry `avatar` and verify with a unit test that the repository receives the unchanged bytes after `sanitizeDeep` + `playerSchema.parse`
- [x] 2.3 Make `sanitizeDeep` in `src/utils/sanitize.ts` return `Uint8Array` unchanged and verify with a unit test that nested avatar bytes survive sanitization with identical contents
- [x] 2.4 Make `timestampsToDates`/`datesToTimestamps` in `src/services/firestoreHelpers.ts` pass through `Uint8Array` and Firestore `Bytes` and verify with unit tests that both converters leave binary values untouched
- [x] 2.5 Convert `avatar` between `Uint8Array` and Firestore `Bytes` in `firestorePlayerRepository.ts` (`Bytes.fromUint8Array` on write, `.toUint8Array()` on read) and verify with a unit test using the real `Bytes` class that repository conversion round-trips the bytes

## 3. Form state and dirty tracking

- [x] 3.1 Add `avatar: Uint8Array | null` to `PlayerFormState` and update `createEmptyFormState`, `playerToFormState`, `formStateToCreateInput`, `formStateToUpdateInput` in `src/hooks/playerFormHelpers.ts`; verify with unit tests that avatar round-trips form → create/update input → form (and null for players without avatar)
- [x] 3.2 Add a binary-safe `JSON.stringify` snapshot serializer (base64 for `Uint8Array`) and use it for dirty snapshots in `usePlayerForm` and `PlayerEditModal`; verify with unit tests that identical bytes produce equal snapshots, different bytes produce different snapshots, and existing dirty-tracking tests still pass (`PlayerEditModal` has no snapshots — only `usePlayerForm` needed)

## 4. Photo block in PlayerInfoSection

- [x] 4.1 Add i18n keys `player.edit.photo`, `photoAdd`, `photoChange`, `photoDelete`, `photoApply`, `photoZoomIn`, `photoZoomOut`, `photoTitle`, `photoMinSize`, `photoUnsupportedType`, `photoLoadError` to `src/locales/ru/translation.json` and `src/locales/en/translation.json`; verify both files parse as JSON and contain matching key sets
- [x] 4.2 Create `src/components/player/avatarInput.ts` with file validation (JPEG/PNG/WebP decode via `createImageBitmap`, shortest side ≥ 700px) returning a typed result; verify with unit tests (mocked `createImageBitmap`) for: valid 700px, rejected 699px, rejected undecodable file
- [x] 4.3 Replace the `{/* Место для фото */}` placeholder in `PlayerInfoSection` with the photo block: label, 200×200 preview from an object URL when `avatar` exists, add («Добавить») / change («Изменить») button with hidden `input[type=file]` plus drag-and-drop on the button, and delete («Удалить») button; verify with component tests: no avatar → label + add button; avatar → preview + change + delete; delete calls `onUpdateBasic('avatar', null)` and reverts to the add button
- [x] 4.4 Handle invalid input in the photo block (min-size/unsupported-type → `AlertModal` notification, no crop modal) and valid input → open the crop modal; verify with component tests (crop modal mocked): 699px image shows the localized notification and does not open the modal, valid image opens the modal

## 5. Crop math and modal

- [x] 5.1 Create pure helpers in `src/components/player/avatarCrop.ts` (initial crop = `min(w,h)`, zoom clamped to `[700, min(w,h)]`, pan clamped inside the image, display↔source scale); verify with unit tests covering zoom-in limit at 700px, zoom-out limit at min side, and pan clamping on all four borders
- [x] 5.2 Create `src/components/player/AvatarCropModal.tsx` (daisyUI `dialog.modal` like `AlertModal`: container-fitted square frame, pointer drag to pan, `BsZoomIn`/`BsZoomOut`, «Применить»/«Отмена»; apply draws a 700×700 canvas selection, encodes via `@jsquash/jpeg` `encode(imageData, { quality: 77 })`, calls `onApply(Uint8Array)`); verify with component tests (mocked `@jsquash/jpeg` + canvas): cancel calls nothing, apply calls `onApply` with the mocked encoded bytes, zoom buttons respect the 700px limit
- [x] 5.3 Wire the crop modal into `PlayerInfoSection` so apply sets `onUpdateBasic('avatar', bytes)` and the preview updates; verify with a component test (modal mocked): `onApply` from the modal reaches `onUpdateBasic('avatar', …)` and the preview renders the new value

## 6. Integration checks

- [x] 6.1 Run `npm run test:run` and verify the full suite passes (all new and existing tests) — **76 files / 836 tests green**
- [x] 6.2 Run `npx tsc -b` and `npm run build` and verify both succeed (the build also proves `@jsquash/jpeg` WASM bundles under Vite) — **tsc clean, build succeeded (16.18s)**
- [x] 6.3 Run `npx eslint` on all touched files and verify no new errors are reported — **only the pre-existing `no-control-regex` in sanitize.ts:29 (present before this change)**
- [x] 6.4 Run `openspec validate --change "player-avatar-photo"` and verify the change validates, then confirm all checkboxes in this file are `[x]` — **`openspec validate "player-avatar-photo"` → valid; all boxes checked**
