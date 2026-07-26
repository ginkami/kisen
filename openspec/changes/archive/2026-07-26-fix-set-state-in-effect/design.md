## Context

The ESLint rule `react-hooks/set-state-in-effect` (from `eslint-plugin-react-hooks` v7+) flags synchronous `setState` calls inside `useEffect` bodies. These cause cascading renders — React renders once for the effect, then re-renders when setState triggers. The rule is part of the modern React best-practice guidelines (React 19 era).

There are 5 violations across 4 files, plus 1 `react-refresh/only-export-components` violation in `AuthContext.tsx`.

## Goals / Non-Goals

**Goals:**
- Eliminate all 6 ESLint errors
- Preserve existing behavior (no functional regressions)
- Use idiomatic React 19 patterns

**Non-Goals:**
- Rewriting the form hook architecture
- Changing the public API of hooks or components
- Fixing any other ESLint warnings (e.g., missing deps)

## Decisions

### Decision 1: Layout.tsx — derive initial state from refs or move to lazy init

**Choice:** Use a ref + lazy initializer pattern. The `isAdminOpen` state should be initialized with a function that checks `isAuthenticated && shouldAutoOpenAdmin(pathname) && window.matchMedia(...)`. Since `isAuthenticated` is not available at initial render time, keep the effect but guard it with a ref to prevent re-firing.

**Alternative:** Use `useSyncExternalStore` for the media query — overkill for this simple case.

### Decision 2: NewTournamentButton.tsx — remove effect, clear error inline

**Choice:** Remove the `useEffect` that calls `setError(null)` on pathname change. The error is already cleared in `createTournament` (line 53: `setError(null)`). If clearing on navigation is still desired, do it in `handleClick` or use a `key` prop to remount the component.

### Decision 3: AuthContext.tsx — extract useAuth to separate file

**Choice:** Move the `useAuth` function to `src/context/useAuth.ts` and re-export it from `AuthContext.tsx` for backward compatibility.

### Decision 4: usePlayerForm.ts — useQuery `enabled` + callback pattern

**Choice:** Instead of `useEffect` to sync `player` query data into `formState`, use the `onSuccess` callback of `useQuery` to set the initial form state. This avoids the effect entirely.

### Decision 5: useTournamentForm.ts — same pattern as usePlayerForm

**Choice:** Use `onSuccess` callback in `useQuery` for tournament data sync, and reset `createError` via the query key change (TanStack Query already resets state on key change).

## Risks / Trade-offs

- **[Risk] onSuccess callback fires multiple times with staleTime** → Mitigation: `onSuccess` fires when new data arrives, which is correct for initializing form state.
- **[Risk] Breaking the form reset on data reload** → Mitigation: the `onSuccess` pattern replaces the effect; behavior is identical.
- **[Trade-off] Splitting AuthContext into two files** → Slightly more files, but clear separation of concerns.