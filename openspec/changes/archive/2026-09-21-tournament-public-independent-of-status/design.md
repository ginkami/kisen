## Context

The tournament document carries `status` (lifecycle: draft/upcoming/ongoing/finished/canceled/proposed_for_removing, derived in `TournamentService.update()` via `computeTournamentStatus`) and `isPublic` (visibility on the site). Today `isPublic` is derived inside `update()` from the status, the invariant is enforced by the Firestore rule `isValidPublicStatus()` and by a zod refine on `publishedTournamentSchema`. The edit form shows «Опубликовать» only for `status === 'draft'`, and the pairing tools drawer requires `status === 'ongoing'`.

## Goals / Non-Goals

**Goals:**
- `isPublic` becomes an independent boolean: "the tournament is visible on the site", settable for any status.
- Unpublished tournaments of any status can be fully run: pairings tab, pairing tools drawer, draw publishing — no status-based restrictions in the editor.
- «Скрыть» / "Unpublish" button in the edit form header (between Save and Delete), alternating with «Опубликовать», driven by `isPublic` rather than status.

**Non-Goals:**
- No changes to the status lifecycle itself (sticky draft, data-driven escalation, rollback) — statuses keep their current semantics.
- No changes to public pages / home board filters (they already filter by `isPublic` and/or status).
- No manual status override UI.
- No backfill script: existing documents keep their stored `isPublic`.

## Decisions

### Decision 1: `isPublic` is an explicit input, never derived
**Choice:** `UpdateTournamentInput.isPublic?: boolean`; `update()` writes `input.isPublic !== undefined ? input.isPublic : existing.isPublic`. The derivation `nextStatus !== 'draft' && nextStatus !== 'proposed_for_removing'` is deleted. `publish()` passes `isPublic: true`; the new `unpublish()` passes `isPublic: false`.
**Rationale:** deriving on every save would flip `isPublic` back on any save of a hidden published tournament. Keeping the stored value as the default makes every existing save path (draft saves, pairing auto-saves) a no-op for visibility.

### Decision 2: drop the domain and rules invariants
**Choice:** remove the `publishedTournamentSchema` refine (`status !== 'draft'`) and the Firestore rule function `isValidPublicStatus()` (and its calls in tournament create/update).
**Rationale:** the invariant contradicts the new requirement. `publishedTournamentSchema` is used only in the publish mutation for pre-validation; publish still requests `status: 'upcoming'`, so nothing else changes there.

### Decision 3: `unpublish()` mirrors `publish()` at the service level
**Choice:** `TournamentService.unpublish(id, existing?)` → `update({ id, isPublic: false, existing })`; no publish-form validation (hiding does not require complete data). The hook's `unpublishMutation` calls it directly (bypassing the form-state save pipeline, same as `publishMutation` today which publishes the stored state, not the dirty form).
**Rationale:** symmetric with `publish()`, minimal surface, no risk of accidentally persisting a dirty form.

### Decision 4: header buttons driven by `isPublic`, with confirmation for hiding
**Choice:** «Опубликовать» rendered when `!tournament.isPublic` (any status, validation + confirm dialog as today); «Скрыть» rendered when `tournament.isPublic`, with a confirm modal («Скрыть турнир? Он перестанет быть виден на сайте.» / "Unpublish the tournament? It will no longer be visible on the site."); both disabled while any of save/publish/unpublish/delete is in flight.
**Rationale:** consistent with the existing publish/delete modal UX; alternating by `isPublic` guarantees exactly one of the two is visible.

### Decision 5: drawer availability drops the status condition only
**Choice:** `pairingToolsAvailable = (activeTab === 'pairings' || activeTab === 'crosstable') && !!formState`.
**Rationale:** the drawer already protects invalid states itself (`actionsDisabled` mirrors publish-validation invariants); the status gate was the only remaining restriction for unpublished tournaments.

## Risks / Trade-offs

- **[Risk] Public page may now serve a `draft` tournament** if an organizer makes a draft public (`isPublic: true`). → Accepted: this is exactly the requested behavior ("be visible on the site"); the public page keeps gating on `isPublic === true` only.
- **[Risk] Old clients / cached rules** enforcing the invariant would reject writes with independent `isPublic`. → Rules update ships with the deploy; `firebase deploy --only firestore:rules` as part of release.
- **[Trade-off] `unpublish()` publishes the stored state only** (like today's publish) — a dirty form is not persisted by hiding; acceptable and consistent.
