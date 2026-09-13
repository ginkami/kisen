## 1. Component

- [x] 1.1 Create `src/components/tournament/PairingToolsDrawer.tsx`: right-side fixed drawer (`w-80`, `bg-base-200`, `translate-x-full` when closed), sticky header with `BsDice6` + `tournament.edit.pairingTools.title`, `BsX` close button, Escape-to-close, empty content body
- [x] 1.2 Keep the panel as an overlay (no main-content push)

## 2. Layout integration

- [x] 2.1 Extend `LayoutOutletContext` with `closeAdminDrawer`, `isPairingToolsOpen`, `setPairingToolsOpen`; own the open state in `Layout`
- [x] 2.2 Make the side drawers mutually exclusive: `Layout.toggleAdmin` closes the pairing tools drawer; the form's toggle closes the AdminDrawer via context
- [x] 2.3 Reset the drawer open state on route change

## 3. Pairings wiring

- [x] 3.1 Lift `activeRound`: controlled `PairingsSection` (`activeRound` + `onActiveRoundChange`), export `resolvePairingsActiveRound(requested, publishedRounds, roundCount)`
- [x] 3.2 `TournamentEditForm`: `pairingsRound` state, `pairingToolsAvailable` flag (ongoing + pairings tab + active round = publishedRounds + 1), `togglePairingTools` (closes AdminDrawer when opening)
- [x] 3.3 `PairingsBoard`: optional `onTogglePairingTools`; render the `BsDice6` button in the rows header slot (`☗ [dice] ☖`) only when the callback is provided
- [x] 3.4 `TournamentEditForm`: render the right-side sticky tab (`fixed right-0 top-17 rounded-l-box`, `BsDice6`) when available and the drawer is closed, and the drawer when open; pass `pairingToolsAvailable` / `onTogglePairingTools` to `PairingsSection`

## 4. i18n

- [x] 4.1 Add `tournament.edit.pairingTools.{title,open,close}` to `src/locales/ru/translation.json`
- [x] 4.2 Add the matching keys to `src/locales/en/translation.json` ("Pairing assistant" / "Open pairing assistant" / "Close pairing assistant")

## 5. Tests

- [x] 5.1 New `src/test/pairingToolsDrawer.test.tsx`: title rendering, close button, Escape
- [x] 5.2 Extend `src/test/pairingsBoard.test.tsx`: header dice button renders with the callback and invokes it; absent without it
- [x] 5.3 Extend `src/test/tournamentEditFormAccess.test.tsx`: drawer + sticky tab visible on the pairings tab of an ongoing tournament at `publishedRounds + 1` (open flow works); hidden for non-ongoing tournaments; outlet-context test double
- [x] 5.4 Wrap `tournamentPublishFeedback.test.tsx` form renders in an outlet-context provider (context extension)

## 6. Verification

- [x] 6.1 `npm run test:run` — full suite green
- [x] 6.2 `npm run build` — type-check and bundle succeed
