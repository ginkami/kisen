## Why

The drawer tournaments list was moved to the `['tournaments','editable',...]` query key, but all cache invalidations still target the orphaned `['adminTournaments']` key, and the draft-creation flow (`NewTournamentButton`) does not invalidate anything at all. As a result, a newly created or saved tournament does not appear in the drawer's month list or search without a full page reload, and deleted/published tournaments keep showing stale state.

## What Changes

- Replace the orphaned `['adminTournaments']` invalidations with `['tournaments']` prefix invalidations in `useTournamentForm` (draft-creation effect, save, publish, delete) — the prefix covers both the drawer's `['tournaments','editable',...]` list and the `['tournaments','search',...]` results.
- Invalidate `['tournaments']` after a successful `createDraft` in `NewTournamentButton`.
- No changes to queries themselves, Firestore rules, or indexes.

## Capabilities

### New Capabilities

- `tournament-list-cache`: cache invalidation contract for the drawer tournament list — draft creation, saving, publishing, and deleting a tournament refresh the drawer's month list and search without a page reload.

### Modified Capabilities

- (none)

## Impact

- `src/hooks/useTournamentForm.ts` (4 invalidation sites + removal of the orphaned `['adminEvents']` invalidations), `src/components/NewTournamentButton.tsx` (post-create invalidation).
- Events are unaffected: `useEventForm` already invalidates the `['events']` prefix, which covers the drawer's `['events','editable',...]` key.