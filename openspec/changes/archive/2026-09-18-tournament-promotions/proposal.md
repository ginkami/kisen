## Why

Tournaments need a way to be promoted on the platform's home page (e.g. for federation events). There is no entity to describe a promotional window and no way for an administrator to control what is displayed prominently.

## What Changes

- New domain entity `promotion` (Firestore collection `promotions`): `{ id, tournament (FK → tournament.id), showOnHome, startedAt, endedAt }` — extensible in the future. CRUD operations are restricted to users with the `admin` role (Firestore rules); reads are public (the home page renders promoted cards for visitors).
- The tournament edit form's «Settings» tab gains a «Продвижение» (en: «Promotion») section, visible only to admins:
  - a «Промоактивность» (en: «Promotional activity») button (`BsPlus`) that creates a new promotion document for the tournament;
  - a card per promotion of the tournament with: a status badge («не началась» / «проходит» / «завершена» derived from `startedAt`/`endedAt`), a daisyUI toggle «Показывать на главной странице» (`showOnHome`), «Действует» datetime inputs «с»/«по» (`startedAt`/`endedAt`, validated so «с» is earlier than «по»), a «Сохранить» button (disabled without changes) and a «Удалить» button with a confirm modal.
- The home page renders tournament cards (same card as the tournament sections) under the h1, above the status tablist, for promotions with `showOnHome == true` whose `startedAt`/`endedAt` window covers the current time. Cards are sorted: active promotions on top (by `startedAt` desc), upcoming nearest first (by `startedAt` asc), finished at the bottom (by `endedAt` desc).
- When a tournament is deleted, all promotions referencing it are deleted as well (client-side cascade in the tournament service, non-fatal on failure).

## Capabilities

### Modified Capabilities
- `tournament-management`: ADDED requirements — promotion entity with admin-only CRUD (Firestore collection `promotions`), the «Продвижение» settings section with promotion cards, and promoted tournament cards on the home page.

## Impact

- **Affected specs:** `openspec/specs/tournament-management/spec.md` (ADDED requirements).
- **Affected code:** new `src/domain/promotion.ts` (schema + status/sort helpers), new `src/services/promotionService.ts` (CRUD), `firestore.rules` (`promotions` match block), `src/components/tournament/PromotionSection.tsx` (new), `src/components/tournament/TournamentEditForm.tsx` (section wiring), `src/components/home/PublicTournamentsBoard.tsx` (promoted cards), `src/services/tournamentService.ts` (`getByIds`), `src/locales/{en,ru}/translation.json`, tests (`promotionDomain.test.ts`, `promotionSort` cases).
