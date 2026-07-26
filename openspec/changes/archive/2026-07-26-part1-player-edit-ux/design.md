## Context

The player domain model (`src/domain/player.ts`) defines:
- `locales`: `Record<string, PlayerLocale>` where `PlayerLocale` has `familyName`, `givenName`, `title?`, `club?`, `location?`
- `nationality`: ISO 3166-1 alpha-2 (required)
- `residence?`: ISO 3166-1 alpha-2
- `gender`: `'men' | 'women' | null`
- `currentRating`: `{ value: number | null, rank: PlayerRank | null }`
- `birthDate`: `Date | null`
- `primaryAssociation`: `UUIDv7 | null`
- `secondaryAssociations`: `UUIDv7[]`

The existing tournament edit form (`TournamentEditForm.tsx`) establishes UI patterns:
- Header block with technical subheading, h1 title, status badge, Save/Delete buttons
- `ExpandableField` for optional empty fields (collapsed behind `+ Label` button)
- `CountrySelect` with SVG flags
- `LocaleTabs` for locale switching
- `AssociationPickerModal` for association selection

`PlayerService` (`src/services/playerService.ts`) provides `getById`, `create`, `update`, `delete`.

## Goals / Non-Goals

**Goals:**
- Full player edit form with all fields from the domain model
- Reusable `PlayerInfoSection` component for future modal use
- Form state management hook (`usePlayerForm`) matching tournament pattern
- Association management with primary/secondary logic and role-based restrictions
- Page title and h1 update reactively with player name

**Non-Goals:**
- Player photo/avatar upload
- Player statistics or game history
- Bulk player import/export
- Player merge/deduplication

## Decisions

### Decision 1: `usePlayerForm` hook following `useTournamentForm` patterns

Structure mirrors `useTournamentForm`:
```ts
interface PlayerFormState {
  locales: Record<SupportedLocale, PlayerLocaleFields>
  nationality: string
  residence: string
  gender: Gender | null
  ratingValue: string  // string for input binding, parsed to number on save
  rank: PlayerRank | null
  title: string  // звание/титул, in active locale
  birthDate: string  // 'YYYY-MM-DD' for input binding
  primaryAssociation: string | null
  secondaryAssociations: string[]
}
```

Key behaviors:
- `useQuery` loads player by ID (skip for `new`)
- `useState` for form state + `lastSavedSnapshot` for dirty detection
- `useMutation` for save (create via `playerService.create` or update via `playerService.update`) and delete
- `useEffect` calls `setHasUnsavedChanges(isDirty)`
- When `playerId === 'new'` and `firebaseUser` exists, immediately initialize empty form state (no auto-creation until save)

### Decision 2: `PlayerInfoSection` as separate component

Extract into `src/components/player/PlayerInfoSection.tsx`:
- Props: `formState`, `activeLocale`, `onLocaleChange`, `onUpdateLocale`, `onUpdateBasic`, `onUpdateRating`, `associations`, `onAddAssociation`, `onRemoveAssociation`, `canEditAssociations`, `isCreating`
- Contains the card with locale switcher, all input fields, and association badges
- Can be imported directly for modal use without the full page chrome

### Decision 3: Rating/Разряд/Title grouped behind single ExpandableField

Three fields — rating value, rank (select), and title (text) — share a single `ExpandableField` with label "Рейтинг". The `isEmpty` check is: all three are empty (`ratingValue === ''`, `rank === null`, `title === ''`). When expanded, render a `grid-cols-3` with:
- Rating: `<input type="number">`
- Rank: `<select>` with kyu/dan options + null option
- Title: `<input type="text">`

This requires passing `isEmpty` explicitly to `ExpandableField` and using the `children` prop for the custom grid layout.

### Decision 4: Association management with primary/secondary distinction

- Associations displayed as badges (like tie-breaks in TournamentEditForm)
- First association badge = `primaryAssociation` ONLY if the current user is the player's creator (`player.createdBy === currentUserId`)
- All subsequent badges = `secondaryAssociations`
- "Ассоциация" button opens `AssociationPickerModal` — same component used in tournaments, but on select we add to secondary (or primary if first)
- Badge removal: clicking `×` on primary clears `primaryAssociation` (only for creator); clicking `×` on secondary removes from array
- For `user` role: entire association block is disabled (read-only badges shown, no add/remove)

### Decision 5: Page title pattern

```tsx
const localizedFamilyName = formState.locales[activeLocale]?.familyName ?? ''
const localizedGivenName = formState.locales[activeLocale]?.givenName ?? ''
const displayName = localizedFamilyName && localizedGivenName
  ? `${localizedFamilyName}, ${localizedGivenName}`
  : t('player.new')

useEffect(() => {
  document.title = t('player.edit.pageTitle', { name: displayName })
}, [displayName, i18n.language, t])
```

### Decision 6: Birth date input

Use `<input type="date">` with value in `YYYY-MM-DD` format. Convert to/from `Date | null` in `usePlayerForm` (on load: `Date → ISO string`, on save: `ISO string → Date | null`).

## Risks / Trade-offs

- **[Risk: ExpandableField with custom children may not re-collapse correctly]** → Mitigation: use `isEmpty` prop to control initial state; once expanded, it stays expanded until the form reloads.
- **[Risk: AssociationPickerModal shows only current user's associations]** → For viewing already-linked associations by ID, we need a separate query or lookup. Mitigation: use `useAssociations` hook or add a `getByIds` method. Alternatively, store association titles in a local cache when the badge is added.
- **[Risk: Primary association assignment logic is complex]** → Mitigation: clearly separate the logic in `usePlayerForm.addAssociation` — check if current user is creator AND no primary exists → set as primary, else add to secondary.