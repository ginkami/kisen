## Context

The first pairing-assistant change scoped the Undo/Redo history to the round being prepared (`tournamentId:round` keys), cleared it whenever `publishedRounds` changed, and rendered the drawer only while the `publishedRounds + 1` round sub-tab was active on the "Pairings" tab. The host's real editing flow spans rounds: fixing results in published rounds, publishing, adjusting participants — none of which is undoable today. `publishDraw`/`unpublishDraw` already auto-save via `saveMutation.mutate(next)` (fresh state override), which is the pattern to reuse for snapshot restoration that changes `publishedRounds`.

## Goals / Non-Goals

**Goals:**
- One per-tournament history (50 entries) of pairing-relevant snapshots: `games`, `publishedRounds`, participants' composition/`player` links/`startingPoints`.
- Record every games change (any round), `publishedRounds` change, and composition/starting-points change; never record internal participant edits (rating, names, etc.).
- Restore via `restorePairingSnapshot` with participant reconciliation that never reverts internal attributes; auto-save when `publishedRounds` changes.
- Drawer available on "Pairings" (any round) and "Crosstable" tabs of an `ongoing` tournament; sticky tab tooltip; generate/clear disabled while earlier rounds are incomplete.

**Non-Goals:**
- No changes to the pairing engine (`pairing-engine` spec untouched).
- No history for settings, schedule, tie-breaks, or internal participant attributes.
- No redesign of the drawer layout beyond enabling/disabling existing buttons.

## Decisions

### Decision 1: Snapshot shape and change detection via projection
**Choice:** Snapshot = `{ games: Game[], publishedRounds: number, participants: Participant[] }`. Recording is triggered by a form-level effect comparing a signature: `JSON.stringify({ games, publishedRounds, projection })` where `projection = participants.map(p => ({ id, player, startingPoints })).sort(by id)`. The full participant objects are stored for restore, but internal-attribute edits never match the projection and therefore never create history entries.
**Rationale:** An effect over the form state covers every mutation source (board, crosstable results, starting points, publish/un-publish) without wrapping each updater; the storage-level dedupe (comparing before truncating the redo tail) makes re-recording after undo/redo or server normalization harmless.
**Alternatives considered:** wrapping `updateGames`/`publishDraw`/`unpublishDraw`/`updateParticipant`/`updateStartingPoints` individually — brittle, easy to miss a source.

### Decision 2: Restore reconciles participants instead of overwriting them
**Choice:** `restorePairingSnapshot(games, publishedRounds, participants)` rebuilds the participant list from the snapshot but keeps the CURRENT internal attributes (rating, names, etc.) for participants that still exist, applying only `player` and `startingPoints` from the snapshot; participants missing from the current list are restored from the snapshot whole; extra participants are dropped. Games and `publishedRounds` are restored as-is (normalized). When `publishedRounds` differs from the current value, the fresh state is auto-saved via `saveMutation.mutate(next)` (same as publish/un-publish).
**Rationale:** Internal edits are not part of history, so restoring must never revert them; composition and starting points are part of history, so they must be restored exactly. Participants removed after the snapshot are restorable because the snapshot keeps full objects.
**Alternatives considered:** storing only `{ id, startingPoints }` projections (cannot restore removed participants' full data); storing/overwriting full participants (would silently revert names/ratings).

### Decision 3: Per-tournament key, no clearing
**Choice:** Storage key is the `tournamentId` alone; the value keeps `{ entries, index, savedAt }` with the new snapshot shape, capped at 50 entries. `clearPairingHistory` and the round-suffix key are removed.
**Rationale:** The history now describes the whole tournament's games state; clearing on round publish/un-publish would destroy exactly the undo steps the feature is for.

### Decision 4: Availability condition and disabled actions
**Choice:** `pairingToolsAvailable = status === 'ongoing' && (activeTab === 'pairings' || activeTab === 'crosstable') && !!formState`. The drawer always operates on the round being prepared (`publishedRounds + 1`). In the drawer, `actionsDisabled` (computed with `useMemo`) is true when any round `1..publishedRounds` has a game with `result == null` or a participant with no game in that round; it disables "Сформировать пары" and "Отменить пары" but never Undo/Redo.
**Rationale:** Drawing or clearing the round being prepared while earlier rounds are incomplete produces invalid Swiss state; the check mirrors the lone-game/forfeit invariants already used by publish validation.

## Risks / Trade-offs

- **Server normalization after auto-save can differ from the restored snapshot** → one extra "technical" history entry may appear; harmless (dedupe drops exact matches, undo semantics stay consistent).
- **JSON.stringify of games on every relevant render** → comparable to the form's existing dirty-tracking cost; signature comparison is cheap and the effect runs only on state identity changes.
- **Removed participants restored from snapshot data** → snapshot keeps full objects; internal attributes come from the snapshot for participants absent from the current list (unavoidable — no fresher data exists).
