## Why

The org leading an ongoing tournament prepares the next round (publishedRounds + 1) on the Pairings tab. The tools that will assist this (described in a follow-up change) need a dedicated, always-at-hand surface on that exact screen. Reusing the side-drawer pattern already established by AdminDrawer keeps navigation consistent.

## What Changes

- New `PairingToolsDrawer` component: a right-side drawer (mirroring the AdminDrawer chrome, overlaying without pushing content) with the title "Подобрать пары" / "Pairing assistant" (`BsDice6` icon) and empty content for now.
- The drawer, plus its toggle buttons, are rendered only on the tournament edit page when ALL of the following hold:
  - tournament status is `ongoing`;
  - the "Pairings" tab is active;
  - the active round sub-tab inside PairingsSection is the round being prepared (`publishedRounds + 1`).
- Two toggle points (both `BsDice6`): a sticky right-edge tab (mirroring the admin drawer's left tab) and a button in the pairings rows header (`☗ [dice] ☖`) between the player-side headers.
- The two side drawers are mutually exclusive: opening the AdminDrawer closes the pairing tools drawer and vice versa.
- `activeRound` is lifted from `PairingsSection` to `TournamentEditForm` (controlled) so the drawer visibility can react to the selected round sub-tab.

## Impact

- **Affected specs:** `openspec/specs/tournament-management/spec.md` (new requirements: drawer availability, toggle buttons, drawer panel)
- **Affected code:**
  - new `src/components/tournament/PairingToolsDrawer.tsx`
  - `src/components/Layout.tsx` — `LayoutOutletContext` extended (`closeAdminDrawer`, `isPairingToolsOpen`, `setPairingToolsOpen`), mutual-close logic
  - `src/components/tournament/TournamentEditForm.tsx` — availability flag, lifted round state, drawer + sticky tab rendering
  - `src/components/tournament/PairingsSection.tsx` — controlled `activeRound`, exported `resolvePairingsActiveRound` helper, prop pass-through
  - `src/components/tournament/PairingsBoard.tsx` — optional `onTogglePairingTools` prop rendering the dice button in the rows header
  - `src/locales/{ru,en}/translation.json` — new `tournament.edit.pairingTools.*` keys
- No Firestore schema, security rules, or backend changes.
