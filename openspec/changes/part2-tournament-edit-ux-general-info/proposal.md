## Why

The tournament edit form introduced in part 1 still has rough edges that confuse users and clutter the UI. Auto-copying values from the `ru` locale to the `en` locale (and transliterating the arbiter name) silently mutates data the user did not intend to enter. Optional fields always show their labels even when empty, and the locale switcher and country selector do not match the rest of the application's polish. These issues need to be fixed before the form feels production-ready.

## What Changes

- Remove all automatic duplication of field values from one locale to another. Editing the active locale only changes that locale; transliteration will be handled later at display time.
- Hide optional fields (description, venue, arbiter) and their labels behind a `+ <Label>` button when they are empty. The label reappears only after the user expands the field.
- Show locale-switcher buttons in their own script: `РУ` for Russian and `EN` for English.
- Replace emoji flags in the country selector with SVG flags from the `country-flag-icons` package, rendered inside a custom DaisyUI dropdown.
- Prefill the arbiter fields with the authenticated user's given name and family name when a new tournament draft is created.

## Capabilities

### New Capabilities

- `tournament-edit-form-ux`: Refined UX behaviors for the tournament edit form, covering locale isolation, expandable optional fields, localized locale labels, SVG country flags, and arbiter prefill.

### Modified Capabilities

_None — no existing spec-level requirements are changing; these are UX adjustments to the tournament edit form._

## Impact

- Affected UI components: `TournamentEditForm`, `ExpandableField`, `LocaleTabs`, `CountrySelect`.
- Affected hooks and services: `useTournamentForm`, `tournamentService.createDraft`.
- New dependency: `country-flag-icons`.
- No Firestore schema or security-rule changes are required.

## Non-goals

- Transliterating names for display is intentionally deferred to a later change.
- No new form validation rules or publish requirements are being introduced.
- No changes to the tournament domain model or existing published tournaments.
