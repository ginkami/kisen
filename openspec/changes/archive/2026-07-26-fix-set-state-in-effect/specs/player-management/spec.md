## ADDED Requirements

### Requirement: Form hooks use query callbacks instead of effects

The `usePlayerForm` hook SHALL load player data into form state via the `useQuery` `onSuccess` callback (or equivalent derived-state pattern) instead of a `useEffect` that calls `setState` synchronously. This eliminates the `react-hooks/set-state-in-effect` ESLint error. The behavior (form state initialization, dirty detection, lastSavedSnapshot) SHALL remain identical.

#### Scenario: Loading player into form on query success

- **WHEN** the `usePlayer` query resolves with player data
- **THEN** `formState` is populated with `playerToFormState(player)`
- **AND** `lastSavedSnapshot` is set to the JSON string of the initial state
- **AND** no cascading render occurs (no synchronous setState in useEffect body)