# Design

## Context

Tournament edits are explicit-save with a monolithic document held in the edit form's local state. Two editors (tabs or managers) produce silent lost updates on save.

## Decisions

### Decision 1: Integer `revision` + Firestore transaction, checked in the repository
**Choice:** a monotonic integer `revision` on the tournament document (0 for new/legacy). The repository's `update` runs inside `runTransaction`: read the stored revision, compare with the caller's, throw `TournamentConflictError` on mismatch, otherwise write with `revision + 1`. The Firestore rule enforces the same `+1` step (with a `get('revision', 0)` default for legacy documents).
**Rationale:** a transaction makes the check-and-write atomic even under racing saves — a lost update becomes impossible rather than unlikely. The check lives in the repository because only Firestore can observe the stored value atomically; `updatedAt` was rejected as a token (millisecond collisions). The rules-level check additionally covers any write path that bypasses the service.
**Alternatives considered:** `updatedAt` as the version token (collisions); optimistic check only in the service without a transaction (races remain); rules-only enforcement (no typed error for the UI).

### Decision 2: The loaded revision travels with the form state
**Choice:** `TournamentFormState` carries `revision` (from the loaded tournament), the update input propagates it, and the service keeps it in the document it hands to the repository; the repository bumps it on success.
**Rationale:** the form's dirty flag and snapshot machinery already operate on the whole form state, so the expected revision rides along for free; `publish`/auto-save flows that pass an explicit state override keep their revision automatically.
**Alternatives considered:** a separate expectedRevision parameter threaded through every mutation call site.

### Decision 3: Realtime awareness degrades by dirtiness; presence is advisory
**Choice:** the edit form subscribes to the document via `onSnapshot`. While the form is clean, remote changes silently refresh the form state; while dirty, a non-blocking banner warns (same actions as a save conflict: reload with clipboard rescue, or force-save). Presence is a heartbeat document per editor (`tournaments/{id}/sessions/{userId}`, 15 s heartbeat, 30 s staleness, cleanup on unmount) shown as chips; it never blocks editing.
**Rationale:** silent refresh for clean forms keeps views fresh without user action; dirty-form interruption would destroy typing, so it only informs. Presence reduces surprise collisions but cannot be trusted as a lock (stale heartbeats, offline managers) — hence advisory only.
**Alternatives considered:** blocking field-level locks (breaks offline work and is brittle); full CRDT merge (over-engineered for a single-tournament editing flow).
