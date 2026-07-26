## ADDED Requirements

### Requirement: Tournament form hooks use query callbacks instead of effects

The `useTournamentForm` hook SHALL load tournament data into form state and reset `createError` via query callbacks or derived-state patterns instead of `useEffect` blocks that call `setState` synchronously. This eliminates the `react-hooks/set-state-in-effect` ESLint errors. The behavior (form state initialization, dirty detection, lastSavedSnapshot, error reset on tournamentId change) SHALL remain identical.

#### Scenario: Loading tournament into form on query success

- **WHEN** the tournament query resolves with tournament data
- **THEN** `formState` is populated with `tournamentToFormState(tournament)`
- **AND** `lastSavedSnapshot` is set to the JSON string of the initial state
- **AND** no cascading render occurs (no synchronous setState in useEffect body)

#### Scenario: Reset createError on tournamentId change

- **WHEN** the `tournamentId` parameter changes
- **THEN** `createError` is reset to null
- **AND** no synchronous setState is called inside a useEffect body