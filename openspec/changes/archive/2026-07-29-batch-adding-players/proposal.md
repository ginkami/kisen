## Why

Admin needs to add many players at once (e.g. importing tournament participants from external systems). Manual entry one-by-one is slow and error-prone. A CSV import feature saves significant time.

## What Changes

- Add `importFromCsv` method to `PlayerService` — parses CSV (`;`-delimited), converts rank format, validates fields, deduplicates against existing players, creates or updates each row.
- Add `listAll` method to `PlayerRepository` and Firestore implementation for dedup queries.
- Add a bulk-import button (icons `BsPeople BsFiletypeCsv BsPlus`) in AdminDrawer Players section, visible to admin role only. Supports file picker + drag-and-drop.
- Add a results modal (`BulkImportResultModal`) showing added/updated/invalid counts and error details.
- Add i18n keys for bulk import (ru/en).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `player-management`: New CSV import method in PlayerService with validation and dedup.

## Impact

**Affected code:**
- `src/services/playerService.ts` — `importFromCsv` + CSV parsing + rank conversion + validation + dedup
- `src/services/firestorePlayerRepository.ts` — `listAll()`
- `src/services/repository.ts` — add `listAll` to `PlayerRepository` interface
- `src/components/AdminDrawer.tsx` — bulk import button + file input + drag-and-drop + loading state
- `src/components/BulkImportResultModal.tsx` — new modal for results
- `src/locales/ru/translation.json`, `src/locales/en/translation.json` — new keys