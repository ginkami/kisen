# Design

## Context

See proposal.md for motivation. Relevant current state:

- `PlayerFormState` (src/hooks/playerFormHelpers.ts) is shared by `usePlayerForm` (edit page) and `PlayerEditModal`; both render `PlayerInfoSection`, which currently has the `{/* Место для фото */}` placeholder.
- Dirty tracking compares `JSON.stringify(formState)` snapshots (convention: JSON-string snapshots for unsaved-changes detection).
- The write path is `playerFormHelpers` → `playerService.create/update` (`sanitizeDeep` + `playerSchema.parse`) → `firestorePlayerRepository` (`datesToTimestamps` / `timestampsToDates`). All three recursive helpers walk plain objects with `Object.entries` and would silently convert `Uint8Array`/`Bytes` into `{0:…,1:…}` records.
- `firestore.rules` player `update` has no field whitelist — editor-authorized players already accept new fields without rule changes.

## Goals / Non-Goals

**Goals:**
- Store one avatar per player as JPEG bytes (700×700, quality 77) inside the player document.
- Full add/change/delete workflow in the player edit form (page and modal).
- Binary-safe service/repository plumbing and binary-safe dirty snapshots.

**Non-Goals:**
- Displaying avatars outside the edit form (cards, public pages, prints).
- Cloud Storage / external asset hosting.
- Avatar shapes/filters beyond the 700px-square pipeline.
- Migrating existing documents (field is optional).

## Decisions

### Decision 1: bytes in the Firestore document, not Cloud Storage
**Choice:** store the JPEG bytes in the `players` document itself.
**Alternative:** upload to Firebase Storage and keep a URL. Rejected for this MVP: adds bucket setup, rules, and a second persistence path; a 700×700 q77 JPEG (~60–120KB) is far below Firestore's 1MB document limit. Trade-off: document growth per player — acceptable at expected scale; revisit if player counts or photo sizes grow.

### Decision 2: `Uint8Array` in the domain, `Bytes` only at the repository
**Choice:** `avatar: z.instanceof(Uint8Array).optional()` in `playerSchema`; `firestorePlayerRepository.toFirestore` wraps with `Bytes.fromUint8Array`, `fromFirestore` unwraps with `.toUint8Array()`.
**Rationale:** matches the existing convention that Firestore-specific conversions (Timestamp ↔ Date) live only in repositories; keeps the domain renderer-agnostic.

### Decision 3: binary pass-through in the recursive helpers
**Choice:** `sanitizeDeep` (src/utils/sanitize.ts) and `timestampsToDates`/`datesToTimestamps` (src/services/firestoreHelpers.ts) return `Uint8Array` and Firestore `Bytes` instances unchanged instead of recursing.
**Alternative:** special-case `avatar` outside the helpers. Rejected: the helpers are generic; the next binary field would reintroduce the bug. Unit tests will lock the behavior.

### Decision 4: `avatar: Uint8Array | null` in form state, JSON snapshots made binary-safe
**Choice:** add `avatar` to `PlayerFormState`; `usePlayerForm` and `PlayerEditModal` serialize snapshots with a `JSON.stringify` replacer that encodes `Uint8Array` as base64 (so dirty detection sees avatar changes and produces stable strings).
**Alternative:** keep the avatar out of the snapshot. Rejected: an avatar edit would not mark the form dirty.

### Decision 5: Apply writes to the form; persistence happens on Save
**Choice:** «Применить» and «Удалить» only mutate form state; the bytes reach Firestore through the form's existing Save/Confirm flow.
**Rationale:** preserves Cancel/unsaved-changes semantics (a discarded crop must not touch the stored player).

### Decision 6: crop model in source coordinates
**Choice:** pure helper (`src/components/player/avatarCrop.ts`) holds `cropSize` and `offset` in source-image pixels: initial `cropSize = min(w,h)`; zoom-in clamps at `cropSize = 700` (the minimum real-photo area, no upscaling); zoom-out clamps at `cropSize = min(w,h)`; offset is clamped so the square stays inside the image. The on-screen square frame is a container-fitted display size; a single scale factor converts between display and source coordinates. Pointer events drive pan; `BsZoomIn`/`BsZoomOut` (react-icons/bs) drive zoom steps (e.g. ×1.25).
**Rationale:** all math is deterministic and unit-testable without canvas or DOM.

### Decision 7: decode via `createImageBitmap`, encode via `@jsquash/jpeg`
**Choice:** decode picked files with `createImageBitmap(file)` (handles JPEG/PNG/WebP) to validate the ≥700px shortest side before opening the modal; on apply, draw the selection to a 700×700 canvas, read `ImageData`, then `encode(imageData, { quality: 77 })` from `@jsquash/jpeg@^1.6.0` → `Uint8Array`.
**Alternative:** `canvas.toBlob('image/jpeg', 0.77)` — rejected: the requirement mandates jsquash (MozJPEG), whose quality output is reliable across browsers.

### Decision 8: modal chrome and notifications reuse existing patterns
**Choice:** `AvatarCropModal` follows the daisyUI `<dialog class="modal">` pattern of `AlertModal`/`ConfirmModal`; min-size/unsupported-type notices reuse `AlertModal`; new i18n keys live under `player.edit.*` (photo, photoAdd, photoChange, photoDelete, photoApply, photoZoomIn, photoZoomOut, photoTitle, photoMinSize, photoUnsupportedType, photoLoadError) in ru/en.

## Risks / Trade-offs

- [WASM bundling of `@jsquash/jpeg` under Vite 8 dev/build] → verify with `npm run build` and a dev-server smoke test; fallback: explicit `init`/`locateFile` or asset-inclusion config — decided during implementation, no spec impact.
- [happy-dom has no canvas/`createImageBitmap`/WASM] → unit-test the pure crop math, validation, and binary helpers; component tests mock `@jsquash/jpeg` and the decode path; the modal's encode pipeline is covered by mocked ImageData fixtures.
- [Snapshot strings grow to ~130KB with base64 avatar] → JSON stringify cost only runs on state changes; acceptable. Alternative (hash/marker) rejected: adds complexity for equal detection.
- [`Object.entries`-style regressions on new binary fields] → pass-through covered by dedicated unit tests in both helper modules.

## Migration Plan

None required: the field is optional, old documents parse via the optional schema, and the JSONC spec (`schemas/player.jsonс`) documents the new field. Rollback = stop writing the field; stored bytes are inert.

## Open Questions

None blocking: display of avatars outside the edit form is explicitly out of scope (proposal.md) and can be a follow-up change.