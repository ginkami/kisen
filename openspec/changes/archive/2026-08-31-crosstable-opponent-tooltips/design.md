# Design: crosstable-opponent-tooltips

## Context

`CrosstableView` renders a dense fixed-layout table with sticky header/lefc columns (z-30). Round cells come from `roundCell(pid, round)` which already resolves the game, the opponent place, and the result symbol from the hovered player's perspective. `standings` (via `computeStandings`) already carries each participant's tournament points. The results table's `playerCells` (`TournamentResultsSection.tsx:112-140`) defines the established row-card style: flag + country tooltip, rank badge + crown with title tooltip, «familyName, givenName», rating, primary points badge.

DaisyUI ^5.6.17 is in use. Its `tooltip` class supports rich content via a nested `tooltip-content` element (CSS-only, shown on hover/focus); `data-tip` is text-only and insufficient for cards. Existing text tooltips inside this same scroll container work today, so the container does not fundamentally block tooltips.

## Goals / Non-Goals

**Goals:**
- Opponent card tooltip on hover over a paired-game result cell.
- All-opponents card list tooltip on hover over a participant's family name.
- Visual consistency with the results table row cards.

**Non-Goals:**
- Touch/click interaction or mobile-specific tooltips (hover-only, like existing tooltips).
- Any changes to `crosstableModel.ts` or data derivation elsewhere.

## Decisions

### Decision 1: DaisyUI 5 `tooltip-content` instead of custom hover popovers
**Choice:** Wrap cell/name content in `.tooltip` with nested `.tooltip-content` holding the card markup.
**Rationale:** CSS-only (no state, no portal), matches the existing tooltip usage in this exact table; daisyUI is already the project's component library. Risk: content clipped by `overflow-x-auto` on the top row — same trade-off the existing flag tooltips already accept; if it proves problematic in manual QA, switch direction classes.

### Decision 2: Z-index above sticky layers
**Choice:** Tooltip wrappers get `z-50` (`tooltip z-50`), above the sticky headers/columns (`z-30`).
**Rationale:** Without it the card renders under sticky cells when hovering left-side columns.

### Decision 3: Card data from existing computed state
**Choice:** Build `pointsById` from `standings` and `gamesByPid` (per participant, ascending rounds, paired games only + forfeits) with `useMemo`; no model changes.
**Rationale:** `computeStandings` is the single source of truth for points; per-player game lists are trivial view-level derivation. Points shown are the opponent's tournament points (`s.points`, includes `startingPoints`).

### Decision 4: Result badge shows the hovered player's result (user decision)
**Choice:** `+` when the hovered player won that game, `-` when they lost, `=` draw, `?` no result yet. When there is no opponent (forfeit), the card renders only the result badge (`-`, error).
**Rationale:** Confirmed by the user; consistent with the symbol already displayed in the hovered cell.

### Decision 5: Tooltip visibility rules
**Choice:** Cell tooltip only for paired games (`player2 != null`, status not `bye`/`forfeit`). Name tooltip lists one card per game with an opponent (forfeit → result-only card); byes are omitted. If no such games exist, no name tooltip.
**Rationale:** «Пропуск» has no opponent — a card would be empty noise (user requirement); forfeits keep visibility of the penalty in the name tooltip.

## Risks / Trade-offs

- Tooltip content is always in the DOM (CSS-hidden). For ~100 participants × ~10 rounds this adds DOM nodes; acceptable for read-only public pages. If it becomes heavy, lazy-render on row hover is the fallback.
- `whitespace-nowrap`/`truncate` on the name cell must not clip the tooltip wrapper; the tooltip wraps an inline-block inside the existing cell, truncation stays on the inner text span.
