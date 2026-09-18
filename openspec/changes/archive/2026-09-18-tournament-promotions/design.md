# Design

## Context

Promotions describe a time window in which a tournament is displayed prominently on the home page. The entity must be extensible (future promotional attributes) and manageable only by administrators.

## Decisions

### Decision 1: One Firestore document per promotion in the `promotions` collection
**Choice:** collection `promotions`, one document per promotion with an auto-generated UUID id and a `tournament` FK. A tournament may have several promotions (each «Промоактивность» click creates a new one).
**Rationale:** extensible per the requirement; a singleton per tournament would prevent future multi-campaign promotions; per-document CRUD matches the admin-only rules naturally.
**Alternatives considered:** storing promotions inside the tournament document (coupling, no independent rules); a singleton settings document (rejects multiple promotions).

### Decision 2: Public reads, admin-only writes via the existing `isAdmin()` claim
**Choice:** `allow read: if true` (the home page renders promoted cards to visitors), `allow create, update, delete: if isAdmin()` — the same custom-claim convention as `app/settings` and user deletion.
**Rationale:** visitors must see the promotion without authentication; the platform already provisions the `admin` claim for administrators.

### Decision 3: Promotion creation creates a document immediately
**Choice:** clicking «Промоактивность» creates a promotion with `showOnHome: false`, `startedAt: now`, `endedAt: now + 7 days`; the card's fields are then editable. «Сохранить» is disabled until the card differs from the stored document.
**Rationale:** an immediate document gives a stable id for the card and its delete/save operations; no separate draft state.
**Alternatives considered:** a local unsaved card (id handling and rules would need a create-on-save anyway).

### Decision 4: Home page filters and sorts promotions client-side
**Choice:** the home page loads all promotions (the collection is small), filters `showOnHome && startedAt ≤ now ≤ endedAt`, fetches the referenced tournaments by ids (chunked `getByIds`), and sorts: active first by `startedAt` desc, then upcoming by `startedAt` asc, then finished by `endedAt` desc.
**Rationale:** no composite indexes; the volume of promotions is tiny; live time-based filtering avoids stale windows.

### Decision 5: Tournament deletion cascades to its promotions client-side
**Choice:** `tournamentService.delete(id)` calls `promotionService.deletePromotionsByTournament(id)` **after** the tournament document is removed; the cascade failure is logged (`console.warn`) but does not fail the deletion.
**Rationale:** running the cascade after the tournament delete means a failed cascade leaves only harmless orphaned promotion documents (the home page cannot render them — the tournament no longer resolves), while deleting promotions first could destroy promotion data for a tournament whose deletion subsequently failed. This matches the established post-effect style of `delete` (non-fatal `eventService.syncStartYearMonth`) and the client-side cascade precedent of `cascade-clear-association-links`.
**Alternatives considered:** an atomic Firestore batch of the tournament delete plus promotion deletes (would require a cross-collection repository method and breaks the service layering); a fatal cascade (degrades the UX of tournament deletion for a secondary side effect).

## Migration Notes

- New Firestore collection `promotions` — deploy the updated `firestore.rules` before use.
