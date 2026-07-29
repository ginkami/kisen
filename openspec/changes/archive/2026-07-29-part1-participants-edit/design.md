## Context

The tournament edit form (`TournamentEditForm.tsx`) has four tabs: general, settings, schedule, participants. The first three are implemented; **participants is a placeholder** (lines 1059–1065). The domain already supports a `participants` array on `Tournament` (`participantSchema`), and `participantSchema` was just extended to include optional `locales[locale].title`, `locales[locale].location`, and `residence`.

The admin drawer (`AdminDrawer.tsx`) already contains a working player search UI (debounced input + result list using `PlayerCard`) that we want to reuse inside the Participants tab. The schedule section demonstrates the row-add/remove pattern with tooltip-styled circular buttons (`BsPlus` / `BsX`) that we will mirror.

Key constraints:
- No new runtime dependencies (project already ~1.4 MB bundle; avoid radix-ui/headlessui).
- `usePlayerForm` is tightly coupled to routing and outlet context; cannot be reused directly inside a modal.
- Participant `id` (integer) is a stable tournament-internal identifier; a separate transient `rowId` is needed for React keys and form-state operations (same approach as `ScheduleRow`).

## Goals / Non-Goals

**Goals:**

- Implement full participant CRUD in the tournament form, mirroring the Schedule section UX.
- Enable linking participants to global players with three entry points: button-link existing player, button-search-and-link (popover), and familyName autocomplete (popover).
- Allow in-place editing of a linked player via a modal reusing `PlayerInfoSection`.
- Reuse existing UI primitives: `ExpandableField`, `CountrySelect`, `LocaleTabs`, `ConfirmModal`, `PlayerCard`.
- Keep `useTournamentForm` as the single source of truth for tournament form state (including participants).
- Extract reusable player-form helpers and a reusable player-search panel, reducing future duplication.

**Non-Goals:**

- Participant import / seeding (e.g., from rating lists) — separate work.
- Pairing / game generation from participants — separate work.
- Starting points UI on this tab — always 0 here.
- Removing/renaming the existing `usePlayerForm`-based player edit page.
- Changing Firestore security rules or repository/service signatures.
- Adding accessibility primitives beyond what existing components already provide.

## Decisions

### Decision 1: Participants live in `useTournamentForm` as a row array

Add `participants: ParticipantRow[]` to `TournamentFormState`, where:

```ts
interface ParticipantRow {
  rowId: string            // transient, for React keys + operations
  id: number               // tournament-internal participant id (persisted)
  player: string | null    // UUIDv7 of linked player
  locales: Record<SupportedLocale, {
    familyName: string
    givenName: string
    title: string
    location: string
  }>
  nationality: string
  residence: string
  ratingValue: string      // string for form input; converted on save
  rank: PlayerRank | null
}
```

- **Why**: mirrors the proven `ScheduleRow` pattern (transient rowId + persisted fields). Keeps a single dirty-detection source (`JSON.stringify(formState)` vs `lastSavedSnapshot`).
- **Mapping**: `tournament.participants` → rows on load; rows → `participants` on save (assign sequential `id` 1..N; preserve existing ids when lengths match to minimize churn).
- **CRUD**: `addParticipant(afterRowId?)`, `updateParticipant(rowId, patch)`, `removeParticipant(rowId)`.

### Decision 2: `ParticipantsSection` + `ParticipantRow` as separate components

- `ParticipantsSection` owns the card (header + locale switcher + row list + add/remove dispatch).
- `ParticipantRow` renders one card: player-link controls + localized text fields + rating/rank + expandable optional fields.
- Both live in `src/components/tournament/`; `ParticipantRow` can be a co-located component or its own file (prefer its own file for readability).

### Decision 3: Self-hosted combobox for both popovers (no radix-ui)

Reuse the exact pattern from `ScheduleEventCombobox`:
- `relative` container + `absolute` dropdown panel.
- Open on focus / on input change; close on blur via `setTimeout(..., 150)` (allows click to register).
- Results from `usePlayerSearch(query)`; debounced internally.
- One component, two display modes controlled by a prop:
  - `variant="search"` — visible title + search input (used by the `BsFillPersonPlusFill` button popover and by `AdminDrawer`).
  - `variant="inline"` — no title, no input; uses the host input's value as the query (used by the familyName autocomplete).

**Why over radix-ui/daisyUI dropdown**:
- Consistency with existing code (one combobox pattern in the app).
- Zero new dependencies; no portal/stacking-context conflicts.
- Full control over the debounced query + result rendering.

### Decision 4: `PlayerSearchPanel` extracted from `AdminDrawer`

New `src/components/player/PlayerSearchPanel.tsx`:
- Props: `query`, `onQueryChange`, `onSelect(player)`, `locale`, optional `placeholder`, optional `variant`.
- Internally calls `usePlayerSearch(query)` and renders loading / empty / result list (using `PlayerCard`).
- `AdminDrawer` refactored to use this component; its existing behavior is preserved.

### Decision 5: `PlayerEditModal` is a self-contained modal, not a `usePlayerForm` instance

New `src/components/player/PlayerEditModal.tsx`:
- Loads the player via `useQuery([PLAYER_QUERY_KEY, id], playerService.getById)`.
- Holds a local `PlayerFormState` via `useState`.
- Reuses `PlayerInfoSection` for the form body.
- Save → `playerService.update(formStateToUpdateInput(player, state))` → returns updated player → modal closes and the caller runs the "overwrite participant?" confirm.
- **Does not** use `useNavigate` or write to the outlet context (unlike `usePlayerForm`).

**Shared helpers** extracted to `src/hooks/playerFormHelpers.ts`:
- `playerToFormState(player): PlayerFormState`
- `formStateToUpdateInput(player, state)`
- `validatePlayerForm(state)`
- `createEmptyFormState()`

`usePlayerForm` imports these helpers (safe refactor — pure functions with identical signatures).

**Why not reuse `usePlayerForm`**:
- It calls `useNavigate()` in mutation `onSuccess` (would navigate away from the tournament page).
- It writes to `useOutletContext().setHasUnsavedChanges`, conflicting with the tournament form's dirty tracking.
- It contains delete + create flows not needed in the modal.

### Decision 6: Confirm flows use the existing `ConfirmModal`

Four confirm scenarios, all using `ConfirmModal`:
1. Remove participant.
2. Unlink player from participant.
3. Overwrite participant card from player (after player link/edit/save).
4. (No confirm for the familyName autocomplete path — by requirement.)

The confirm modals are managed by `ParticipantRow` (or `ParticipantsSection`) local state: `{ type, isOpen }`.

### Decision 7: Translations under `tournament.edit.participants`

Add keys to both `ru` and `en`:
- `title` ("Участники турнира" / "Tournament participants")
- `add`, `remove`, `removeConfirmTitle`, `removeConfirm`
- `familyName`, `givenName`, `ratingValue`, `rank`, `country`, `location`, `residence`, `titleField`
- `linkPlayer`, `unlinkPlayer`, `editPlayer`, `searchPlayerTitle`
- `linkConfirmTitle`, `linkConfirm` (overwrite from player)
- `unlinkConfirmTitle`, `unlinkConfirm`

## Risks / Trade-offs

- **[Self-hosted popover edge cases]** → Mitigated by reusing the tested `ScheduleEventCombobox` pattern; documented `setTimeout` blur handling. Acceptable for an admin-only UI.
- **[Participant `id` reassignment on save]** → We preserve existing ids where possible; only assign new sequential ids when new rows have no id. Risk of id shifts if rows are deleted and the array is compacted — acceptable for an unpublished draft; published tournaments will snapshot participants into games separately (existing `games[].player1/2` reference participant ids, so reassignment must be done carefully — **mitigation**: keep ids stable across edits by reusing existing ids in order and only assigning new ids for genuinely new rows).
- **[`usePlayerForm` refactor regression]** → Extracting helpers is a pure-function move with identical signatures; covered by the existing `PlayerEditForm` page continuing to work. Verify via build + manual test.
- **[Bundle size]** → No new dependencies; new components add <1 KB gzip collectively.
- **[Scope creep]** → Pairing/games explicitly excluded; starting points fixed at 0.