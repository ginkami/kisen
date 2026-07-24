## Context

The tournament edit form's "Settings" tab contains two subsections: time control and tie-breaks. The current `TieBreaksSection` component in `src/components/tournament/TournamentEditForm.tsx` filters out tie-break types that are already present in the list (`!tieBreaks.some((tb) => tb.type === type)`), preventing multiple `buchholz_cut` entries. The `addTieBreak` callback in `src/hooks/useTournamentForm.ts` hardcodes `cutCount: 1` and also blocks duplicates.

When a new tournament draft is created, `TournamentService.createDraft` calls the private `defaultSettings()` function in `src/services/tournamentService.ts`, which currently returns `{ type: 'absolute', mainTime: 0 }` for time control and `[{ type: 'points' }]` for tie-breaks. Shogi tournaments typically use byoyomi time control and a standard three-item tie-break sequence (points → Buchholz → Sonneborn-Berger).

The Zod schema `tieBreaksSchema` in `src/domain/tieBreak.ts` already supports multiple `buchholz_cut` entries via the `buchholzCutTieBreakSchema` (with `cutCount: z.number().int().min(0).default(1)`), so no domain schema changes are needed.

## Goals / Non-Goals

**Goals:**
- Allow the user to add multiple `buchholz_cut` tie-breaks with different `cutCount` values via the tournament edit form UI.
- Provide a numeric input for `cutCount` that appears when `buchholz_cut` is the selected tie-break type.
- Change default draft settings to byoyomi time control and a three-item tie-break sequence.

**Non-Goals:**
- Editing `cutCount` after a `buchholz_cut` tie-break has been added (only set at add-time).
- Changing the Zod schema for tie-breaks — it already supports the needed shapes.
- Modifying Firestore security rules or indexes — defaults and UI behavior only.
- Migrating existing tournament drafts to the new defaults — only new drafts are affected.

## Decisions

### Decision 1: Allow duplicates only for `buchholz_cut`

The `availableTypes` filter in `TieBreaksSection` will exclude types already present in the list for all types **except** `buchholz_cut`. This type can be added multiple times because each instance carries a distinct `cutCount` parameter that differentiates it.

**Alternative considered:** Allow duplicates for all tie-break types. Rejected because other types (e.g., `buchholz`, `sonneborn_berger`) have no distinguishing parameters — duplicates would be meaningless and confusing.

### Decision 2: `cutCount` input visible only when `buchholz_cut` is selected

A `NumberField` for `cutCount` will be rendered conditionally when `selectedType === 'buchholz_cut'` in the add-control row. It will default to `1` and have `min={0}` (matching the Zod schema's `z.number().int().min(0)`).

**Alternative considered:** Always show the `cutCount` input. Rejected because it would be irrelevant for all other tie-break types and add visual noise.

### Decision 3: Change `addTieBreak` signature to accept optional `cutCount`

The `addTieBreak` callback in `useTournamentForm` will change from `(type: TieBreakType) => void` to `(type: TieBreakType, cutCount?: number) => void`. For `buchholz_cut`, the duplicate check will be removed and the provided `cutCount` (defaulting to `1`) will be used. For other types, the duplicate check remains.

### Decision 4: Use array index as React key for tie-break badges

Currently `key={tb.type}` is used, which will break with duplicate `buchholz_cut` entries. Switching to `key={index}` (the array index in the rendered `.slice(1).map()`) resolves this. Since tie-breaks are added at the end and removed by index, this is stable enough for the list's lifecycle.

### Decision 5: Defaults live in `defaultSettings()` in `tournamentService.ts`

The `defaultSettings()` function is the single source of truth for new draft settings. Changing it there (rather than in the hook or component) ensures consistency regardless of how the draft is created.

## Risks / Trade-offs

- [Risk: Users may add many `buchholz_cut` entries with redundant `cutCount` values] → Mitigation: The UI still shows each entry as a badge with its `cutCount` in parentheses, making duplicates visible and removable.
- [Risk: Existing tests might depend on `addTieBreak` signature] → Mitigation: No existing test files were found for `useTournamentForm`; the only test file is `src/App.test.tsx`, which does not touch tie-breaks.
- [Risk: Changing defaults may surprise users who expect "absolute" time control] → Mitigation: The time control type is editable in the UI; users can switch back to "absolute" if needed. This aligns defaults with shogi conventions.