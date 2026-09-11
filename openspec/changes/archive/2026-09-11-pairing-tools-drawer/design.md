## Context

The tournament edit page (`TournamentEditForm`) renders `PairingsSection`, which owns the active round sub-tab as local state. The drawer visibility condition depends on that round, so the state must be observable from the form. `AdminDrawer` (left side, `Layout.tsx`) already establishes the side-drawer pattern: fixed panel, sticky tab button when closed, escape-to-close.

## Goals / Non-Goals

**Goals:**
- Ship the drawer skeleton with correct visibility gating and two toggle points.
- Keep the pairings board layout untouched except for the empty `w-10` header slot.

**Non-Goals:**
- The assistant tools themselves (follow-up change).
- Pushing main content when the drawer opens (rejected: the pairings board is wide; overlay only).
- Swipe-to-close on the drawer (AdminDrawer parity can be added later).

## Decisions

### Decision 1: Lift `activeRound` to `TournamentEditForm` (controlled `PairingsSection`)
**Choice:** `PairingsSection` takes `activeRound: number | null` + `onActiveRoundChange`. `null` means "not picked yet" and falls back to the previous default logic (publishedRounds + 1 when it exists), extracted into an exported pure helper `resolvePairingsActiveRound(requested, publishedRounds, roundCount)` shared by the section and the form.
**Rationale:** The drawer visibility needs the selected round; the helper keeps a single source of truth for default/clamp behavior. Behavior before the first tab click stays identical.

### Decision 2: Drawer open state lives in `Layout`, exposed via `LayoutOutletContext`
**Choice:** Add `isPairingToolsOpen` / `setPairingToolsOpen` / `closeAdminDrawer` to the outlet context. `Layout.toggleAdmin` closes the pairing tools drawer; the form's toggle closes the AdminDrawer before opening the assistant.
**Rationale:** Both side drawers can then close each other without a global event bus; the open state also resets on route change (`useEffect` on `pathname`) so a stale "open" never leaks into another page.

### Decision 3: Availability flag computed in `TournamentEditForm`
**Choice:** `pairingToolsAvailable = tournament?.status === 'ongoing' && activeTab === 'pairings' && resolvePairingsActiveRound(...) === publishedRounds + 1`.
**Rationale:** All three conditions are form-level; the flag is passed down (`PairingsSection` → `PairingsBoard`) so the header dice button renders only when available. When `publishedRounds === roundCount` the round `publishedRounds + 1` does not exist as a sub-tab, so the flag is correctly false.

### Decision 4: Board header toggle via optional prop
**Choice:** `PairingsBoard` gains `onTogglePairingTools?: () => void`; the button replaces the empty `<div className="w-10" />` slot and renders only when the callback is provided. `PairingsSection` forwards it only when `pairingToolsAvailable`.
**Rationale:** `PairingsBoard` stays presentation-only and safe for other contexts; the grid layout is unchanged.

## Risks / Trade-offs

- The two drawers overlap on mobile; mutual closing mitigates it (both cannot stay open).
- The drawer overlays the board's right edge on narrow screens; the assistant tools (follow-up) should account for it.
