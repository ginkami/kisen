## Context

Publish flow today: the Publish button opens a confirm dialog; confirming calls `publish()`, which runs `validateTournamentPublishForm` (title, location, arbiter, at least one round row, participant names, slug) and only then mutates. The mutation builds the schedule via `splitSchedule`, which silently skips rows without `scheduledAt`, and `publishedTournamentScheduleSchema` requires `rounds` with a non-empty array of rounds each carrying a `scheduledAt: z.date()`. Result: a tournament whose rounds have no times passes pre-validation, the mutation throws a ZodError, and the user only sees the generic `tournament.edit.errors.publish` alert at the top of the page.

## Goals / Non-Goals

- Goals: no silent publish failures — every publish-blocking validation problem is surfaced before the confirm dialog, with the form switched to the offending tab and the failing fields highlighted.
- Non-Goals: no changes to `publishedTournamentScheduleSchema` or the publish mutation itself (it stays as the backstop); no auto-fixing of times; no changes to Save flow (its own error paths unchanged).

## Decisions

### Decision 1: validator owns the new rule, component owns the UX
`validateTournamentPublishForm` gains the `roundTime` check (`rounds` keeps its "no rounds at all" meaning) and is exported. The hook exposes `setValidationErrors`. The component's `handlePublish` runs the validator first: on errors it translates them into `validationErrors`, switches `activeTab` to the first failing area via a key→tab map, and does not open the confirm dialog. The hook's `publish()` keeps its own validation as a backstop.

### Decision 2: key→tab map for tab switching
`title`/`location`/`arbiter.*`/`slug` → general, `rounds`/`roundTime` → schedule, `participants` → participants. The first key in insertion order wins — validator insertion order (title, location, arbiter, rounds, roundTime, participants, slug) produces a sensible priority.

### Decision 3: inline highlighting plus hint text in ScheduleSection
`ScheduleSection` receives `validationErrors`; round rows without `scheduledAt` get the `input-error` class while a relevant error is present, and a hint line (`roundTimeRequired` when `roundTime` is set, `roundRequired` when `rounds` is set) is shown above the rows. Hint lines disappear as soon as the user edits anything (`updateForm` clears `validationErrors`).

## Risks / Trade-offs

- Highlighting clears on the first edit (existing blanket `setValidationErrors({})` behavior) — acceptable; the user has already been brought to the offending fields.
- The pre-check duplicates the translation of error keys already done in `publish()` — kept small and colocated.

## Migration Plan

Additive UI behavior; rollback = revert the commit.

## Open Questions

None.