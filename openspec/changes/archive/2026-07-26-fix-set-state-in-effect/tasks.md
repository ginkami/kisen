## 1. AuthContext fix

- [x] 1.1 Move `useAuth` function to a new file `src/context/useAuth.ts`
- [x] 1.2 Re-export `useAuth` from `src/context/AuthContext.tsx` for backward compatibility
- [x] 1.3 Verify all imports still resolve (`grep` for `useAuth` imports)

## 2. Layout.tsx fix

- [x] 2.1 Replace the `useEffect` that calls `setIsAdminOpen(true)` with a useState-based pattern (avoiding ref-in-render)
- [x] 2.2 Verify admin drawer still auto-opens on desktop when navigating to tournament edit pages

## 3. NewTournamentButton.tsx fix

- [x] 3.1 Remove the `useEffect` that calls `setError(null)` on `location.pathname` change
- [x] 3.2 Ensure `setError(null)` is already called at the start of `createTournament` (line 53) — no additional change needed
- [x] 3.3 Verify error is cleared when retrying tournament creation

## 4. usePlayerForm.ts fix

- [x] 4.1 Replace the `useEffect` that syncs `player` query data into `formState` with render-time state adjustment using useState
- [x] 4.2 Inside render-time adjustment, call `setFormState(initial)` and `setLastSavedSnapshot(JSON.stringify(initial))`
- [x] 4.3 Verify loading an existing player for editing still works

## 5. useTournamentForm.ts fix

- [x] 5.1 Replace the `useEffect` that syncs `tournament` query data into `formState` with render-time state adjustment using useState
- [x] 5.2 Replace the `useEffect` that resets `createError` on `tournamentId` change with render-time useState pattern
- [x] 5.3 Verify loading an existing tournament for editing still works
- [x] 5.4 Verify creating a new tournament draft still works

## 6. Verification

- [x] 6.1 Run `npm run lint` — 0 errors (1 pre-existing warning)
- [x] 6.2 Run `npm run build` — TypeScript compilation and Vite build pass