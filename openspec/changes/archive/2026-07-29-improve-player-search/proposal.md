## Why

Player search in the admin panel currently matches only the active locale's `familyName`, so a player whose name exists solely in a non-active locale (e.g. an English-only player while the UI is in Russian) is never found. Operators need to locate any player regardless of which locale their family name is stored in.

## What Changes

- **BREAKING**: `PlayerRepository.searchByFamilyName` signature changes from `(prefix, locale)` to `(prefix)` — the method now searches across all supported locales.
- `FirestorePlayerRepository.searchByFamilyName` runs a parallel range query for each supported locale (`ru`, `en`), merges and deduplicates results by `player.id`, and caps the combined output.
- `PlayerService.searchByFamilyName` is updated to the new `(prefix)` signature.
- `usePlayerSearch(query, locale)` becomes `usePlayerSearch(query)`; `locale` is removed from the query key and query function.
- `AdminDrawer` calls `usePlayerSearch(playerSearch)`; the active locale is still passed to `PlayerCard` for display fallback (current locale, then any non-empty locale).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `player-management`: player family-name search SHALL match across all supported locales (was: only the active locale), with display fallback to any non-empty locale.

## Impact

- **Code**: `src/services/firestorePlayerRepository.ts`, `src/services/repository.ts`, `src/services/playerService.ts`, `src/hooks/usePlayers.ts`, `src/components/AdminDrawer.tsx`.
- **APIs**: Internal repository/service method signature change (`searchByFamilyName`). No external API or Firestore security-rule changes.
- **Dependencies**: No new dependencies. Uses existing `supportedLocales` from `src/domain/locale.ts`.
- **Firestore**: No new composite indexes required — each per-locale range query reuses existing single-field indexes.
- **Behavior**: Up to N parallel Firestore reads per search (N = number of supported locales, currently 2) instead of 1; latency remains comparable due to parallelism.