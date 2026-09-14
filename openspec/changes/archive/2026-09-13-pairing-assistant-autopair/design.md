## Context

`PairingToolsDrawer` (right-side drawer, rendered on the tournament edit page when status is `ongoing`, the "Pairings" tab is active and the round being prepared is `publishedRounds + 1`) currently has an empty body. All round pairing state lives in `formState.games` and every games-changing UI action funnels through `updateGames(round, gamesForRound)` from `useTournamentForm`. Points and tie-break statistics already exist in `pairingsModel.ts` / `crosstableModel.ts` (`calculateParticipantPoints`, `computeStandings`); ratings are `participant.capturedRating.value`; color history is `game.sente` when `settings.considerSente`. Local persistence precedent: `src/utils/tournamentDraftStorage.ts` uses the `idb` package with a dedicated database.

## Goals / Non-Goals

**Goals:**
- One-click automatic Swiss pairing of all unpaired participants of the active round via a weighted graph + Edmonds blossom maximum-weight matching.
- Local (IndexedDB) Undo/Redo history of the round's pairing states, cleared when the round is published / un-published.
- Drawer tools: undo/redo buttons (disabled when inapplicable), "Сформировать пары", "Отменить пары" with confirm, failure alert "Невозможно составить пары".
- Manual pairs/results/forfeits already present in the round are never altered by auto-pairing.
- Simulation test suite proving Swiss invariants.

**Non-Goals:**
- No server-side pairing, no Firestore changes, no domain schema changes.
- No acceleration/float-down rules beyond the score-group exponential penalty (no FIDE Dutch exactness — the goal is "good Swiss", not rulebook compliance).
- No handling of `adjourned` games or advanced bye policies (e.g. half-point byes).
- No re-design of `PairingsBoard` editing; board interactions stay as-is.

## Decisions

### Decision 1: Pure engine modules next to `pairingsModel.ts`
**Choice:** New `src/components/tournament/pairings/blossom.ts` (generic maximum-weight matching, O(n³) blossom implementation) and `src/components/tournament/pairings/pairingEngine.ts` (statistics, weights, bye node, sente assignment, `generatePairings() → Game[]`). No new npm dependency.
**Rationale:** `pairingsModel.ts` already hosts pure pairing helpers; blossom is ~200 lines and avoids a supply-chain dependency for a core algorithm. Purity makes the engine unit-testable and simulation-testable without React or IndexedDB.
**Alternatives considered:** npm package `blossom`-style libs (unmaintained, untyped); web-worker isolation (premature: n ≤ ~300, matching runs in milliseconds).

### Decision 2: Weight model — exponential score dominance, bounded other penalties
**Choice:** For a candidate pair (a, b) the edge weight is `-(P_score + P_rating)`, where:
- `P_score = 2^(10 × |ptsA − ptsB|)` — each 0.5-point step multiplies the penalty by ~×32, so any larger score difference always outweighs the sum of all smaller-difference pairs' penalties (participants ≤ ~300 ⇒ worst case ≈ 2^100, within double precision).
- `P_rating = P_group + P_close` — bounded by `RATING_PENALTY_MAX = 10^4` total: (a) subgroup emulation — inside a score group, players are ordered by rating; pairs inside the same half get a large penalty, pairs across halves get `|i − (j − h)|` (h = ⌊n/2⌋, ideal "upper ↔ lower" alignment); (b) small closeness tie-break `λ·|ratingA − ratingB|` (λ chosen so it never exceeds the subgroup component's granularity).
**Rationale:** Exponential scaling makes "same score group first" lexicographically dominant as the requirement demands ("перевесит любые другие плюсы"), while keeping all rating-related penalties on one bounded scale below the smallest score step.
**Alternatives considered:** Linear penalties (do not guarantee dominance); lexicographic multi-pass matching (much more complex, same result).

### Decision 3: Hard constraints remove the edge; color checks consider both orientations
**Choice:** Forbidden pairs are simply not added to the graph: players who already met in published rounds; a player who already skipped a round (bye or forfeit game in published rounds) is forbidden from a bye; with `considerSente`, a pair is forbidden when in BOTH orientations (either player as sente) some player would get a 3rd identical color in a row or a color balance beyond ±2. When at least one orientation is legal, the orientation with the smaller resulting imbalance is preferred later.
**Rationale:** Removing edges is the cleanest mapping onto matching; checking both orientations matches the reality that the engine chooses sente after matching.

### Decision 4: Bye via virtual node inside the matching
**Choice:** If the number of unpaired players is odd, a virtual "bye" vertex is added; its edge weight to player p is forbidden if p already skipped a published round, otherwise a large penalty growing with points (and rating as tie-break) so the bye goes to the weakest player. The matching must cover every real player exactly once (paired or bye). Otherwise `generatePairings` throws `PairingError` and the drawer shows the alert.
**Rationale:** Reuses one algorithm for pairings and bye assignment and keeps "everyone placed exactly once" as a structural guarantee.

### Decision 5: Locked participants and output
**Choice:** Participants already having any game in the active round (manual pairs, byes, carried-over forfeits) are excluded from the graph. The engine returns only the NEW games; the drawer merges them with the existing round games and applies everything via a single `updateGames(round, ...)` call. New games get `status: 'not_started'`, `result: null`, `sente: 'unknown'` (or balanced sente when `considerSente`), ids via `uuidv7()`.
**Rationale:** Single-caller semantics make the auto-pairing result exactly one Undo/Redo action and keep board state the single source of truth.

### Decision 6: Sente assignment is deterministic and balance-driven
**Choice:** After matching, per pair: if `considerSente == false` → `sente: 'unknown'`. Otherwise the player with the smaller color imbalance (sente-count − gote-count over published rounds) gets sente; ties broken by fewer consecutive-same-color exposure, then by lower rating-list position, then by id. Round 1 (no history): higher rating gets sente.
**Rationale:** Deterministic output keeps simulations reproducible and satisfies the color constraints enforced in Decision 3.



### Decision 7: Undo/Redo history in a dedicated IndexedDB store
**Choice:** New `src/utils/pairingHistoryStorage.ts` modeled on `tournamentDraftStorage.ts`: DB `kisen-pairing-history` v1, store `pairingHistory`, key `«tournamentId»:«round»`, value `{ entries: { games: Game[] }[], index: number, savedAt: number }`. `push` appends a snapshot and truncates the redo tail (cap 50 entries); `undo`/`redo` move `index`. `src/hooks/usePairingHistory.ts` mirrors the state in React state for synchronous `canUndo`/`canRedo` and returns async actions.
**Rationale:** Reuses the established idb-per-feature pattern; separate DB avoids touching draft storage schema/versioning. A snapshot is exactly the round's `Game[]`, which is what `updateGames` restores.
**Alternatives considered:** In-memory only (lost on reload — the host's most dangerous moment); same DB as drafts (couples versioning).

### Decision 8: What counts as an action and when history clears
**Choice:** Every `updateGames` call targeting the active round pushes a history entry (auto-pairing is one call = one action; each manual board edit / result change = one action). A `useEffect` in `TournamentEditForm` clears the history when `publishedRounds` changes (publish or un-publish of any round) — the "current round changed" trigger from the requirements. The history key includes the round number, so switching sub-tabs cannot cross-contaminate.
**Rationale:** Matches the requirement that the auto-pairing result is one action, gives full undo coverage of the round, and makes cleanup structural.

### Decision 9: Drawer integration — data via props, not context
**Choice:** `PairingToolsDrawer` receives `tournamentId, round, participants, games, publishedRounds, considerSente, updateGames` from `TournamentEditForm` (which already owns all of them). Layout top-to-bottom: (1) one row with `BsArrowCounterclockwise` / `BsArrowClockwise` (`btn btn-ghost btn-sm btn-circle` + daisyUI `tooltip tooltip-left`), disabled per `canUndo`/`canRedo`; (2) `CgSwiss` "Сформировать пары" (`btn btn-primary`); (3) spacer; (4) bottom `btn-outline btn-error` "Отменить пары" → `ConfirmModal` (variant `error`, message «Все пары {n}-го тура будут расформированы») → `updateGames(round, [])`. Failure path uses a new `src/components/AlertModal.tsx` (single OK button, same `dialog.modal` pattern as `ConfirmModal`).
**Rationale:** The form is the single owner of tournament data (mirrors how `PairingsSection` gets its props); props keep the drawer easy to test. Note: `CgSwiss` is expected from `react-icons/cg`; if the export does not exist in the installed version, fall back to the closest available icon (documented in tasks).
**Alternatives considered:** Context store (no precedent in codebase); lifting history into `useTournamentForm` (pollutes the hook with UI-concern persistence).

## Risks / Trade-offs

- **Blossom correctness** → dedicated unit tests on known small graphs plus simulation tests; keep the implementation self-contained against the classic O(n³) algorithm.
- **Undo/Redo vs concurrent board edits** (drawer history and board edits share `formState.games`) → history is recorded through the same `updateGames` funnel from the form level, so board edits are captured too; undo restores the exact prior `Game[]`.
- **IndexedDB unavailable (private mode, tests)** → storage functions degrade to a no-op history (buttons disabled); tests mock the storage module where needed.
- **Huge weight values (≈2^100) lose additive resolution** → harmless: only comparisons of matchings' total weights matter, and exponential dominance is exactly the intended ordering; rating penalties stay ≥10 orders of magnitude below the smallest score step.
- **Icon availability (`CgSwiss`)** → verified at implementation time; documented fallback if missing.
- **Alert vs confirm semantics overlap** → `AlertModal` is a new tiny component; if review prefers, `ConfirmModal` with a single visible action could be reused without behavior change.
