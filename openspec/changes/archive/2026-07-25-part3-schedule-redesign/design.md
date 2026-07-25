## Context

The tournament edit form's schedule section (`ScheduleSection` in `src/components/tournament/TournamentEditForm.tsx`) renders a unified chronological feed of schedule rows. Each row has a datetime input and a `ScheduleEventCombobox` component that serves as both the event type selector and text input.

The current `ScheduleEventCombobox` (lines 527–650):
- Shows an `<input type="text">` for all rows (both `kind: 'round'` and `kind: 'event'`)
- First dropdown item is `t('tournament.edit.program.round', { n: nextRoundNumber })` → e.g., "1-й тур"
- When user selects it, `handleSelectRound` sets `kind: 'round'` and `number: nextRoundNumber`
- But the input remains editable — the user can accidentally type into a round row
- When typing into a round row, `handleTextChange` converts it back to `kind: 'event'` (line 557–568), losing round data

The preset localization bug is in `handleSelectPreset` (lines 579–592):
```ts
supportedLocales.map((locale) => [
  locale,
  { title: t(`tournament.edit.program.preset.${key}`) },
])
```
`t()` always returns the translation for the active i18n language, not for each individual locale. So if the active language is Russian, all locales get the Russian title.

## Goals / Non-Goals

**Goals:**
- Make round rows visually distinct as non-editable badges
- Eliminate the possibility of accidentally converting a round into an event via typing
- Fix preset event localization so each locale gets its own translated title
- Simplify the dropdown item label for rounds

**Non-Goals:**
- Changing the `ScheduleRow` type or `splitSchedule`/`mergeSchedule` logic in `useTournamentForm.ts`
- Changing domain models, repository layer, or service layer
- Drag-and-drop reordering

## Decisions

### Decision 1: Conditional rendering — badge for round rows, combobox for event rows

When `row.kind === 'round'`, the `ScheduleEventCombobox` component returns early with a non-editable badge:
```tsx
if (row.kind === 'round') {
  return <span className="badge badge-info">{t('tournament.edit.program.round', { n: row.number })}</span>
}
```
The badge displays "N-й тур" / "Round N" where N is the row's `number` (already computed during sorting/renumbering in `sortAndRenumber`).

**Alternative considered:** Keep the `<input>` but add `readOnly` attribute. Rejected because a disabled-looking input is confusing when it's actually a round row — a badge is a clearer mental model and matches the DaisyUI design system.

### Decision 2: First dropdown item is always "Тур" (without number)

The first item in the combobox dropdown changes from `t('tournament.edit.program.round', { n: nextRoundNumber })` to `t('tournament.edit.program.roundOption')` → "Тур" / "Round". This removes the number from the dropdown item because:
- The number shown in the dropdown was confusing (it was a _future_ number, not the actual row number)
- The actual round number is determined after sorting and displayed in the badge

The item is styled with `bg-info` to distinguish it visually from preset events:
```tsx
<li>
  <button type="button" onMouseDown={handleSelectRound} className="w-full text-left bg-info">
    {t('tournament.edit.program.roundOption')}
  </button>
</li>
```

### Decision 3: Per-locale preset translation using `i18n.getFixedT`

Replace `t()` with `i18n.getFixedT(locale)` in `handleSelectPreset`:
```ts
const handleSelectPreset = (key: SchedulePresetKey) => {
  const locales = Object.fromEntries(
    supportedLocales.map((locale) => {
      const fixedT = i18n.getFixedT(locale)
      return [locale, { title: fixedT(`tournament.edit.program.preset.${key}`) }]
    })
  )
  ...
}
```

`i18n.getFixedT(locale)` returns a translation function bound to a specific locale, bypassing the current active language detection. This ensures that when the user selects "Регистрация участников" in Russian UI, the English locale slot receives "Participant registration".

**Alternative considered:** Maintaining a static mapping of preset keys to locale strings outside i18n. Rejected because it would duplicate the translations that already exist in the locale files and break the single source of truth for translations.

### Decision 4: Text input always produces event rows

Since `ScheduleEventCombobox` returns a badge for round rows (Decision 1), text input only applies to event rows. The `handleTextChange` function no longer needs the round→event conversion logic (lines 557–568). The function simplifies to:
```ts
const handleTextChange = (value: string) => {
  onUpdate(row.id, {
    locales: { ...row.locales, [activeLocale]: { title: value } },
  })
}
```

## Risks / Trade-offs

- **[Risk: Removing round→event conversion via text may surprise users]** → Mitigation: This was never an intentional UX flow — users had to deliberately click into the combobox input after selecting a round. With the badge, the mental model is clearer: rounds are structural, events are editable.
- **[Risk: `i18n.getFixedT` may not be initialized for all locales at load time]** → Mitigation: i18next initializes all namespaces synchronously at startup (both `ru` and `en` are bundled as static JSON imports). `getFixedT` will always return a valid translation.
- **[Risk: Existing round rows loaded from Firestore still render correctly]** → Mitigation: No data shape change — `ScheduleRow` for `kind: 'round'` still has `number` and `scheduledAt`. The badge just reads `row.number`.