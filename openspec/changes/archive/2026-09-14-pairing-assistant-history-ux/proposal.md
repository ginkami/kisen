## Why

The pairing assistant's Undo/Redo history is currently scoped to a single round (the round being prepared) and is wiped whenever a round is published or un-published. The tournament host therefore cannot step back through the real editing flow (results in earlier rounds, publishing, participant composition changes). The drawer is also hidden outside the `publishedRounds + 1` round sub-tab, and its actions stay enabled even when earlier rounds are not fully drawn.

## What Changes

- Undo/Redo history becomes a per-tournament history of pairing-relevant snapshots: `{ games, publishedRounds, participants }` (composition + `player` links + starting points; internal participant attributes like rating/name are not recorded and never reverted). The history is kept (50 entries) for the tournament being edited and is no longer cleared when `publishedRounds` changes.
- Snapshots are recorded for every games change (any round: pairs, results, forfeits, byes), `publishedRounds` changes (publish/un-publish), and participant-composition / starting-points changes.
- Undo/Redo restores the snapshot via a new `restorePairingSnapshot` form updater; when the snapshot changes `publishedRounds`, the tournament is auto-saved (same auto-save flow as round publish/un-publish).
- Undo/Redo button tooltips updated to reflect the tournament-wide games-state semantics.
- Drawer availability widens: status `ongoing` plus the "Pairings" tab (any active round sub-tab) or the "Crosstable" tab. On "Crosstable" only the side sticky `FaPeopleArrows` tab is shown; the sticky tab gains the tooltip «Открыть панель жеребьёвки».
- "Сформировать пары" and "Отменить пары" (all actions except Undo/Redo) are disabled while any round `1..publishedRounds` contains a game without a result or a participant without a game (no opponent, no bye, no forfeit).

## Capabilities

### New Capabilities

### Modified Capabilities
- `tournament-management`: pairing tools drawer availability (Pairings tab at any round / Crosstable tab), undo/redo history semantics (per-tournament snapshots incl. participants and publishedRounds, no clearing, auto-save on publishedRounds restore, updated tooltips), generate/clear actions disabled while earlier rounds are incomplete.

## Impact

- **Affected specs:** `openspec/specs/tournament-management/spec.md` (MODIFIED: drawer availability, undo/redo, generate action, clear action). The `pairing-engine` capability is unchanged.
- **Affected code:**
  - `src/utils/pairingHistoryStorage.ts` — snapshot shape `{ games, publishedRounds, participants }`, per-tournament key, no clearing;
  - `src/hooks/usePairingHistory.ts` — per-tournament API;
  - `src/hooks/useTournamentForm.ts` — new `restorePairingSnapshot(games, publishedRounds, participants)` updater with auto-save on `publishedRounds` change;
  - `src/components/tournament/TournamentEditForm.tsx` — snapshot-recording effect, undo/redo handlers, availability condition, sticky-tab tooltip; removal of the round-scoped tracking wrapper and history-clearing effect;
  - `src/components/tournament/PairingToolsDrawer.tsx` — disable generate/clear while earlier rounds are incomplete;
  - `src/locales/{ru,en}/translation.json` — tooltip texts;
  - tests: `pairingHistoryStorage.test.ts`, `usePairingHistory.test.tsx`, `pairingToolsDrawer.test.tsx`, `tournamentEditFormAccess.test.tsx`.
