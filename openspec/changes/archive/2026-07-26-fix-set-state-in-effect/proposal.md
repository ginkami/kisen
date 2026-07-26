## Why

ESLint reports 6 errors (5 `react-hooks/set-state-in-effect` + 1 `react-refresh/only-export-components`) across 5 files. These errors flag anti-patterns where `setState` is called synchronously inside a `useEffect` body, which causes cascading renders. While the app functions correctly today, these patterns hurt performance and violate React best practices promoted since React 19.

## What Changes

- `Layout.tsx`: Replace `setIsAdminOpen(true)` inside useEffect with a `useMemo`-derived initial value or ref-based pattern that avoids the cascading render.
- `NewTournamentButton.tsx`: Remove `setError(null)` effect on pathname change. Instead, clear the error at the point of action (in `createTournament` / `handleClick`).
- `AuthContext.tsx`: Move the `useAuth` hook export to a separate file (`useAuth.ts`) to satisfy the `react-refresh/only-export-components` rule.
- `usePlayerForm.ts`: Replace the `useEffect` that syncs `player` query data into `formState` with either `useQuery`'s `select` option or a `useMemo`-derived state pattern.
- `useTournamentForm.ts`: Replace the `useEffect` that resets `createError` on `tournamentId` change, and the `useEffect` that syncs `tournament` into `formState`, with patterns that avoid synchronous setState in effects.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `player-management`: The `usePlayerForm` hook's data-loading pattern changes from `useEffect`+`setState` to a derived state pattern. No behavioral change.
- `tournament-edit-form-ux`: The `useTournamentForm` hook's data-loading and error-reset patterns change. No behavioral change.

## Impact

**Affected code:**
- `src/components/Layout.tsx` — line 39
- `src/components/NewTournamentButton.tsx` — lines 42-44
- `src/context/AuthContext.tsx` — line 204
- `src/hooks/usePlayerForm.ts` — lines 212-219
- `src/hooks/useTournamentForm.ts` — lines 363-365, 367-373

**APIs/dependencies:** No new dependencies. No API changes.

**Systems:** No behavior change — only refactoring the state synchronization pattern to satisfy the linter.