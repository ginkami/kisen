## Context

Part 2 introduced a localized tournament-edit form with collapsible optional fields and a country selector. Two loose ends remain: the header language switcher still uses the non-localized label `RU`, and the chief arbiter is treated as optional even though every tournament must have one.

## Goals / Non-Goals

**Goals:**
- Display `РУ` / `EN` labels in every locale switcher, including the site header.
- Make `arbiter` required in the domain model and in all service inputs.
- Render arbiter inputs as always-visible required fields in the tournament edit form.
- Prefill arbiter names on new drafts from the authenticated user's profile.

**Non-Goals:**
- Changing the auth flow or user profile schema.
- Adding a separate "chief arbiter" selection from a list of users/players.
- Backfilling arbiter data for legacy tournaments in the database.

## Decisions

- **Header and form switchers use the same label mapping.** A single hard-coded mapping `ru → 'РУ'`, `en → 'EN'` is used in both `LanguageSwitcher` and `LocaleTabs`. This keeps the two components consistent without adding i18n keys for two-letter labels.
- **Make `arbiter` required in `tournamentSchema`.** Since `publishedTournamentSchema` is derived from `tournamentSchema`, the publication validation automatically enforces the arbiter. The Zod fields already use `.min(1)`.
- **Remove `ExpandableField` from the arbiter section.** The arbiter block renders fixed labels and two columns of inputs (family name / given name) per active locale, similar to the title section.
- **Prefill from `user.locales` with Firebase Auth fallback.** When `user` is loaded, names are taken from `user.locales.ru` and `user.locales.en`. If the profile is still loading, names are derived from `firebaseUser.displayName` split on whitespace, applied to both locales. This guarantees a valid arbiter object even if the profile fetch is slow.
- **Repository returns a default arbiter for legacy documents.** `FirestoreTournamentRepository.fromFirestore` will inject a placeholder arbiter (`{ familyName: '', givenName: '' }`) when the stored document lacks one, preventing runtime parse failures for older drafts.

## Risks / Trade-offs

- **[Risk]** Existing drafts saved without an arbiter will now render empty required fields.  
  **Mitigation:** Prefill from the current user on load in `useTournamentForm` if the loaded tournament has no arbiter; repository also injects an empty default so the UI can render.
- **[Risk]** Firebase Auth `displayName` may be missing or unparseable.  
  **Mitigation:** Apply the raw string to `familyName` and leave `givenName` empty; user can edit before publishing.
- **[Risk]** Making `arbiter` required in `CreateTournamentInput` may break `tournamentService.create` if it is used elsewhere later.  
  **Mitigation:** Update the input type and the service method signature now so callers are forced to provide an arbiter.

## Migration Plan

- No Firestore migration is required; the change is enforced in code and form validation.
- After deployment, any tournament created through the UI will contain an arbiter object. Publication validation will reject tournaments with empty arbiter names.

## Open Questions

- None.
