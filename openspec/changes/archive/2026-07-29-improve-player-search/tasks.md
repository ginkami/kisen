## 1. Repository layer

- [x] 1.1 In `src/services/repository.ts`, change `PlayerRepository.searchByFamilyName` signature from `(prefix: string, locale: string)` to `(prefix: string)`.
- [x] 1.2 In `src/services/firestorePlayerRepository.ts`, import `supportedLocales` from `../domain/locale.ts` and rewrite `searchByFamilyName(prefix)` to run a parallel range query per supported locale (`Promise.all`), merge results, deduplicate by `player.id`, and truncate to the overall result cap (20).

## 2. Service layer

- [x] 2.1 In `src/services/playerService.ts`, update `PlayerService.searchByFamilyName` to the new `(prefix: string)` signature and forward `prefix` to the repository.

## 3. Hook and UI

- [x] 3.1 In `src/hooks/usePlayers.ts`, change `usePlayerSearch(query, locale)` to `usePlayerSearch(query)`; remove `locale` from the query key and query function.
- [x] 3.2 In `src/components/AdminDrawer.tsx`, update the single caller to `usePlayerSearch(playerSearch)`; keep `playerLocale` only for the `PlayerCard` `locale` prop.

## 4. Verification

- [x] 4.1 Run `npm run lint` and resolve any type/lint errors.
- [x] 4.2 Run `npm run build` to confirm the production build succeeds.
- [x] 4.3 (Manual) In the admin drawer, verify a prefix match returns players stored in a non-active locale and that display falls back to any non-empty locale.
