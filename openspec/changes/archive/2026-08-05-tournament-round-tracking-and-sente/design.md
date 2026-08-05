## Context

The `tournaments` collection documents currently lack two fields that the human-readable schema (`schemas/tournament.jsonс`) has already been updated to describe:

- `currentRound` — the currently active round number, needed so result entry and pairing flows have a single source of truth for "where we are".
- `settings.considerSente` — a boolean indicating whether player piece color ("sente" / first move) is taken into account when recording game results; this will drive future result-fixation and pairing behavior.

The TypeScript Zod schema in `src/domain/tournament.ts` is the source of truth for the codebase. Today it omits both fields, so a document containing them is still accepted (Zod is non-strict by default) but the fields are invisible to the typed model. The service layer (`TournamentService`) constructs tournaments with explicit field lists, so new fields must be added there to guarantee presence. The repository mappers (`firestoreTournamentRepository.toFirestore` / `fromFirestore`) pass objects through wholesale, so they need no changes.

The tournament edit form (`TournamentEditForm.tsx`) renders the Settings tab from `formState.settings`, which is typed as the full `TournamentSettings`. The form hook already round-trips `settings` as a whole, so a new setting flows through persistence without mapper changes — only an explicit updater and UI control are needed.

## Goals / Non-Goals

**Goals:**
- Make `currentRound` and `settings.considerSente` first-class typed fields on the domain model with safe defaults.
- Guarantee every newly created tournament (both `create` and `createDraft`) has both fields initialized.
- Expose `considerSente` as an editable toggle on the Settings tab inside a new "Advanced" (`Дополнительно`) section.
- Keep existing Firestore documents valid without a migration.

**Non-Goals:**
- Implementing the pairing or result-fixation logic that will consume `considerSente` — that is future work.
- Implementing logic that mutates `currentRound` (e.g. round-advance automation) — this change only adds the field and a default; future changes will drive its value.
- Adding validation rules on `currentRound` against `schedule.rounds.length` — deferred until the field is actually used.
- Changing Firestore rules or indexes.

## Decisions

### 1. Add fields with Zod `.default()` for backward compatibility
- `tournamentSettingsSchema.extend({ considerSente: z.boolean().default(false) })`.
- `tournamentSchema` gets `currentRound: z.number().int().default(0)`.
- **Rationale:** Existing documents without these fields will parse correctly and receive the default, so no data migration is required. New writes will always include the fields because the service constructs them explicitly.
- **Alternative considered:** making the fields required without defaults — rejected because it would break parsing of existing documents and force a migration script.

### 2. Service constructs fields explicitly on create
- `TournamentService.create` and `createDraft` set `currentRound: 0` in the tournament object literal.
- `defaultSettings()` returns `considerSente: false`.
- **Rationale:** Although Zod defaults would cover it at parse time, the service is the authoritative constructor and the codebase pattern is to build the full object in `create`/`createDraft` (see `publishedRounds: 0`). Explicit initialization keeps the intent visible and matches existing tests' expectations.

### 3. Form hook: one focused updater, settings round-trip unchanged
- Add `updateConsiderSente(value: boolean)` mirroring `updateTimeControlField` (uses `updateForm`, updates only `state.settings.considerSente`).
- Do **not** change `tournamentToFormState` or `formStateToUpdateInput` — both already pass `settings` as a whole object, so the new field flows through automatically.
- **Rationale:** Minimal diff, consistent with the existing updater pattern, avoids touching serialization helpers.

### 4. UI: dedicated "Advanced" section component
- New `AdvancedSettingsSection` component (same card style as `TimeControlSection` / `TieBreaksSection`) containing a daisyUI toggle bound to `settings.considerSente`.
- Rendered on the Settings tab after `TieBreaksSection`.
- **Rationale:** Groups future "advanced" toggles; matches the existing section-per-card layout; keeps the change small and reviewable. A toggle (rather than a raw checkbox) is consistent with daisyUI conventions used elsewhere.

### 5. Repository mappers unchanged
- `toFirestore` / `fromFirestore` serialize/deserialize the whole tournament object via `datesToTimestamps` / `timestampsToDates`, so new scalar fields pass through automatically.
- **Rationale:** No code change needed; adding handling would be redundant.

## Risks / Trade-offs

- **[Existing documents without the fields]** → Mitigated by Zod `.default()`: they parse to `currentRound: 0` and `considerSente: false`.
- **[`currentRound` is added but not yet consumed]** → Acceptable: it is a passive placeholder until a future change drives its value; `0` is a safe neutral default and the field is optional in spirit.
- **[`considerSente` has no behavioral effect yet]** → Acceptable for an MVP setting: storing the organizer's intent now lets future result/pairing work read it without a second schema change.
- **[Toggle changes are included in the unsaved-changes snapshot]** → Already handled: the form hook's JSON-snapshot dirty check covers the new field automatically because `settings` is part of `formState`.