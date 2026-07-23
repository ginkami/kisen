## Context

Part 1 introduced a tabbed tournament edit form with localized fields, a country selector, and an arbiter section. After review, several UX issues remain: the form silently copies Russian values into the English locale, optional fields always show their labels even when empty, locale buttons use Latin-script abbreviations, the country selector uses emoji flags, and the arbiter fields start empty for new drafts. This change fixes those issues without altering the tournament domain model or publish rules.

## Goals / Non-Goals

**Goals:**
- Make locale editing predictable by updating only the active locale.
- Reduce visual clutter by collapsing empty optional fields behind a `+ <Label>` button.
- Render locale switcher buttons in their native scripts (`РУ`, `EN`).
- Render SVG country flags inside a custom DaisyUI dropdown.
- Prefill the arbiter section from the authenticated user's profile when a draft is created.

**Non-Goals:**
- Transliterating names for display (deferred).
- Adding new validation rules or changing publication requirements.
- Modifying the tournament domain model or Firestore security rules.

## Decisions

### 1. Remove ru→en mirroring entirely

`useTournamentForm.updateLocale` and `updateArbiter` currently copy values from the `ru` locale to the `en` locale and transliterate the arbiter name. We will delete that logic so each locale is edited independently. The `transliterateCyrillicToLatin` utility will be removed if it is no longer used elsewhere.

**Rationale:** Silent data mutation violates user expectations and makes the form feel unreliable. Transliteration will be handled at display time in a future change.

**Alternative considered:** Keep mirroring behind an explicit "copy to English" button. Rejected because the user explicitly asked for no duplication logic.

### 2. `ExpandableField` owns its own label

`ExpandableField` will accept a `label` prop and render a `+ <Label>` button (using `PlusIcon` from `@heroicons/react`) when the field is empty. When expanded or non-empty, it will render the label above the input. For composite fields such as the arbiter (two inputs), `ExpandableField` will also accept `children` and an optional `isEmpty` prop so the parent can decide when the whole group is collapsed.

**Rationale:** Centralizing the show/hide behavior keeps the parent form layout simple and guarantees that labels are always hidden together with their inputs.

**Alternative considered:** Keep the existing label outside `ExpandableField` and conditionally hide it in the parent. Rejected because it would duplicate the empty-check logic in every optional field.

### 3. Localized locale-switcher labels

`LocaleTabs` will hardcode `ru → 'РУ'` and `en → 'EN'`. These are static labels that identify the script, so they do not need to come from the translation files.

**Rationale:** The user explicitly requested this rendering, and it matches common UI conventions for locale switches.

### 4. Custom DaisyUI dropdown for countries

The native `<select>` element cannot render SVG inside `<option>`, so `CountrySelect` will be rebuilt as a DaisyUI dropdown. The trigger shows the selected country name and flag; the dropdown body shows a scrollable list of all countries with their SVG flags from `country-flag-icons/react/3x2`.

**Rationale:** This is the simplest way to show SVG flags in every option while staying within the existing Tailwind/daisyui design system.

**Trade-off:** A custom dropdown is slightly less accessible than a native select. We will keep keyboard focus management simple and ensure the trigger is a `<button>` with an `aria-expanded` attribute.

### 5. Prefill arbiter during draft creation

`useTournamentForm` already waits for a `firebaseUser` before creating a draft. We will also wait for the loaded `user` profile and pass the user's locale-specific names into `tournamentService.createDraft` via a new optional `arbiter` field on `CreateDraftInput`. The repository will persist that arbiter in the draft document. Existing drafts with saved arbiter data will load normally.

**Rationale:** Creating the draft with the prefilled data keeps the form hook simple and avoids overwriting user edits on later profile updates.

**Alternative considered:** Prefill the form state in `tournamentToFormState`. Rejected because it would require passing the user profile into a transformation function and could reset edits on profile refetch.

## Risks / Trade-offs

- **Custom dropdown accessibility** → Mitigation: use semantic `<button>` trigger, `aria-expanded`, and a focusable list. A more robust combobox can be introduced later if needed.
- ** country-flag-icons bundle size** → Mitigation: importing the full `country-flag-icons/react/3x2` default object pulls in all flag SVGs. For an MVP this is acceptable; if bundle size becomes a concern, switch to dynamic imports per flag.
- **Arbiter prefill delayed by profile loading** → Mitigation: the `useEffect` now waits for `user !== undefined` before creating the draft, so the prefilled data is available immediately.

## Migration Plan

No migration is required. The change only affects the frontend form behavior and the draft-creation payload. Existing published tournaments remain unchanged.

## Open Questions

None.
