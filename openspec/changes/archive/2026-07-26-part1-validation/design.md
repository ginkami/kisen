## Context

The player and tournament edit forms currently lack client-side validation. The `usePlayerForm` and `useTournamentForm` hooks expose `savePlayer` / `saveDraft` / `publish` / `deletePlayer` that call `mutation.mutateAsync()` directly without checking required fields. Error alerts render conditionally on `mutation.error` but mutations are never `reset()`, so the alert persists indefinitely. The player service performs no schema validation before writing to Firestore, allowing empty required fields to be saved. The tournament publish path validates via `publishedTournamentSchema.parse()` but surfaces only a generic error message without per-field guidance.

The existing domain Zod schemas (`playerSchema`, `publishedTournamentSchema`) already encode the required-field constraints. The form hooks already maintain `formState` and `lastSavedSnapshot`. The UI uses DaisyUI classes (`input-error`, `select-error`, `alert-error`) and i18n via `react-i18next`.

## Goals / Non-Goals

**Goals:**
- Block player save when required fields (at least one locale with both `familyName` and `givenName`, `nationality`) are empty.
- Block tournament publish when required fields (title, location, country, arbiter names, at least one round) are empty.
- Highlight invalid required fields with `input-error` / `select-error` classes and a localized "Обязательное поле" message.
- Allow dismissing error alert blocks via a close button and automatic reset before each new attempt.
- Add `playerSchema.parse()` in `PlayerService.create` and `PlayerService.update` as a persistence safety net.
- Fix the locale-filter bug in `usePlayerForm` (OR → keep only locales where both names are filled).

**Non-Goals:**
- Redesigning the form layout or field structure (handled by existing specs).
- Adding cross-field business rules (e.g., rating value range, date plausibility).
- Server-side Firestore rules changes.
- Tournament draft save validation (drafts remain permissive; only publish is strict).

## Decisions

### Decision 1: Validation lives in the form hook, not in the component

**Choice:** Add a `validatePlayerForm(state)` / `validateTournamentPublishForm(state)` function inside the respective hooks, returning a `Record<string, string>` of field-key → message. The hook exposes `validationErrors` and wraps `savePlayer` / `publish` to short-circuit on validation failure.

**Rationale:** The hook already owns `formState` and the mutation lifecycle. Centralizing validation there keeps components simple and ensures the same logic applies regardless of which component consumes the hook.

**Alternatives considered:**
- Validation in the component: would duplicate logic if the hook is reused (e.g., in modals).
- Validation purely via Zod `safeParse` on the assembled domain object: works for publish but is less granular for per-field highlighting in the player form (the schema validates at the `locales` object level, not per-active-locale field).

### Decision 2: Per-field error keys use a stable string identifier

**Choice:** `validationErrors` is a flat `Record<string, string>` with keys like `'familyName'`, `'givenName'`, `'nationality'` (player) and `'title'`, `'location'`, `'country'`, `'arbiter.givenName'`, `'arbiter.familyName'`, `'rounds'` (tournament). Components look up errors by key.

**Rationale:** A flat record is easy to thread through props and check in JSX. Dot-notation keys avoid collisions between nested fields (e.g., arbiter names vs. locale title).

**Alternatives considered:**
- Nested object mirroring form state shape: more type-safe but harder to pass and check inline.
- Zod's `formErrors` format: array-based, harder to do O(1) lookup per field.

### Decision 3: `validationErrors` reset on field change

**Choice:** The `updateForm` callback in each hook clears `validationErrors` (sets to `{}`) whenever any field changes. A fresh validation runs only on the next save/publish attempt.

**Rationale:** Immediate re-validation on every keystroke is noisy and can show errors before the user finishes typing. Clearing on change removes stale errors and lets the user see a clean state while editing.

**Alternatives considered:**
- Re-validate on every change: too aggressive, shows errors during typing.
- Re-validate on blur: more complex to wire up per field; not needed for MVP.

### Decision 4: Mutations use `mutate()` instead of `mutateAsync()`

**Choice:** `savePlayer`, `saveDraft`, `publish`, `deletePlayer`, `deleteTournament` call `mutation.mutate()` (fire-and-forget). The component does not `.then()` on them.

**Rationale:** The components currently call these without `await` and without `.catch()`. With `mutateAsync()`, a rejected mutation produces an unhandled promise rejection. `mutate()` routes the error into `mutation.error` (which the UI already displays) without an unhandled rejection. The `onSuccess` callbacks in the hooks handle navigation and cache updates.

**Alternatives considered:**
- Keep `mutateAsync()` and add `.catch()` in every call site: more verbose, easy to forget.

### Decision 5: `mutation.reset()` before each attempt and on alert dismiss

**Choice:** Before calling `mutation.mutate()`, the wrapper calls `mutation.reset()` to clear any prior error. The UI alert includes a close button that also calls the exposed `clearSaveError` / `clearPublishError` / `clearDeleteError` (which call `reset()`).

**Rationale:** Without `reset()`, the error persists across attempts. Resetting before a new attempt ensures a clean state. The close button gives the user manual control.

### Decision 6: Service-level `playerSchema.parse()` in `PlayerService`

**Choice:** `PlayerService.create` and `PlayerService.update` call `playerSchema.parse(player)` before `repository.create` / `repository.update`. If parsing fails, the error is thrown.

**Rationale:** Even if the UI validation is bypassed (e.g., by a future API client or a bug), the service prevents invalid data from reaching Firestore. This aligns with the existing `publishedTournamentSchema.parse()` pattern in `useTournamentForm.publish`.

**Alternatives considered:**
- Validation only in the repository: violates the principle that repositories are dumb persistence adapters.

### Decision 7: Locale filter fix in `usePlayerForm`

**Choice:** Change the filter in `formStateToCreateInput` and `formStateToUpdateInput` from `familyName !== '' || givenName !== ''` to `familyName.trim() !== '' && givenName.trim() !== ''`.

**Rationale:** The `playerLocaleSchema` requires both `familyName` and `givenName` to be `min(1)`. The OR condition allowed a locale with only one name to pass into the `locales` object, causing a schema violation (now caught by the service-level parse, but previously silently persisted). The AND condition ensures only complete locales are included.

## Risks / Trade-offs

- **[Risk] Validation logic drifts from Zod schema** → The hook validation is hand-written, not derived from Zod. Mitigation: the service-level `parse()` is the authoritative check; hook validation is a UX layer that can be less strict but never more strict.
- **[Risk] `mutate()` hides promise rejection from callers that might later want to `await`** → If a future caller needs to chain after save, they must switch back to `mutateAsync()`. Mitigation: document this in the hook return type JSDoc.
- **[Trade-off] Clearing `validationErrors` on every change means errors disappear while typing** → Acceptable: the user sees errors only on submit, which is a common pattern (unlike onBlur which is more complex).
- **[Trade-off] Flat error keys require manual coordination between hook and component** → Acceptable for the small number of fields; a future refactor could generate keys from a schema.