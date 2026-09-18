# Tasks

## 1. Domain, rules, service

- [x] 1.1 New `src/domain/promotion.ts`: `promotionSchema` (`id`, `tournament`, `showOnHome`, `startedAt`, `endedAt`), `promotionStatus(startedAt, endedAt, now)` and the promotion sort comparator (active → upcoming → finished)
- [x] 1.2 `firestore.rules`: `promotions` match block — public read, admin-only create/update/delete
- [x] 1.3 New `src/services/promotionService.ts`: `listByTournament`, `listAll`, `create(tournamentId)` (defaults), `update(id, patch)`, `remove(id)`; timestamp conversion via firestoreHelpers

## 2. UI

- [x] 2.1 New `src/components/tournament/PromotionSection.tsx`: admin-only «Продвижение» section — «Промоактивность» add button, promotion cards (status badge, showOnHome toggle, «с»/«по» datetime inputs with validation, Save disabled without changes, Delete with confirm)
- [x] 2.2 `TournamentEditForm.tsx`: render the section on the Settings tab (admin only)
- [x] 2.3 `tournamentService.getByIds` (chunked) + `PublicTournamentsBoard`: promoted tournament cards under the h1 (active → upcoming → finished)
- [x] 2.4 i18n en/ru: promotion section, statuses, confirmations, home promoted header (if any)

## 3. Tests and validation

- [x] 3.1 `src/test/promotionDomain.test.ts`: status boundaries and sort order
- [x] 3.2 `tsc -b`, `vitest run`, `openspec validate tournament-promotions` pass

## 4. Cascade deletion on tournament removal

- [x] 4.1 `promotionService.deletePromotionsByTournament(tournamentId)`: query by `tournament == id`, delete the found documents in one Firestore batch
- [x] 4.2 `tournamentService.delete`: cascade call after the tournament is removed, non-fatal with `console.warn`
- [x] 4.3 Tests: cascade invoked with the tournament id, cascade failure does not reject `delete`, batch deletes exactly the found promotion documents

## 5. Fix: document reading failed on Timestamp conversion

- [x] 5.1 Regression: `documentToPromotion` double-converted already-converted `Date` fields through `timestampToDate` (no `toDate()` on `Date` → corrupt `new Timestamp(undefined, undefined)` → `listAllPromotions` rejected → the home board silently rendered no promoted cards). Fixed by parsing the `timestampsToDates` result directly; `timestampToDate` now passes through `Date` inputs
- [x] 5.2 Tests: document parsing from Timestamp-like `{ seconds, nanoseconds }` and native `Date` fields, tournament filtering in `listPromotionsByTournament`
