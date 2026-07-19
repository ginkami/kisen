## Context

The tournament edit page already uses a tabbed layout powered by `TournamentEditForm` and `useTournamentForm`. The previous `tournament-redesign` change removed the `isOnline` flag, made `country` required, replaced multiple arbiters with a single optional chief arbiter, and added IP-based country/city detection. Now we refine the UX of the first tab only: "General info". The user has already adjusted CSS classes for section backgrounds, tab backgrounds/types, and the language switcher; the implementation must reuse those adjusted classes.

## Goals / Non-Goals

**Goals:**
- Reorganize the "General info" tab into an untitled locale-aware section plus a "Binding" section.
- Render labels above inputs, with required labels marked by a red asterisk.
- Provide two-column layout for standalone fields on large screens, one column on small screens.
- Collapse empty optional fields (`description`, `venue`) behind a "+ Label" button.
- Group locale-dependent fields (`name`, `description`, `venue`, `arbiter.givenName`, `arbiter.familyName`) under ru/en tabs.
- Mirror `ru` locale values into the `en` locale while `en` is empty: plain copy for text fields, Cyrillic→Latin transliteration for `givenName`/`familyName`.
- Pre-fill `country` and `city` from IP geolocation for new drafts.
- Add event and association picker modals for `parentEvent` and `hostAssociation`.
- Hide `hostAssociation` from regular users.

**Non-Goals:**
- Changing other tabs, publication logic, statuses, or Firestore rules.
- Adding auto-save or real-time collaboration.
- Machine translation beyond transliteration.
- Archive/sync of the previous `tournament-redesign` change.

## Decisions

1. **Form-state shape**: extend `TournamentFormState` with `slug`, `parentEvent`, `hostAssociation`, and keep `country`/`city` at the top level. Locale-dependent strings are stored as `Record<SupportedLocale, string>` for each field; the arbiter becomes `Record<SupportedLocale, { givenName: string; familyName: string }>`.
2. **Locale mirroring**: implement in `useTournamentForm` update helpers. When the active locale is `ru` and the `en` value is empty, immediately copy/transliterate. This keeps the UI snappy and avoids introducing a new effect.
3. **Country dropdown**: build a small `CountrySelect` wrapper around a native `<select>` or a headless list, using `i18n-iso-countries` for names and emoji flags. Using emoji keeps the component dependency-free and avoids extra icon packages.
4. **Picker modals**: create `EventPickerModal` and `AssociationPickerModal`. They load data via TanStack Query hooks (`useEventsForMonth`, `useMyAssociations`) backed by Firebase repository functions. List items reuse the same text-button style as the admin panel.
5. **Association visibility**: gate the `hostAssociation` field behind `currentUser?.role === 'manager' || currentUser?.role === 'admin'` or by checking whether the user is in any association's `managers` array. Since the modal itself filters by manager/creator rights, hiding the field for users with no manageable associations is also acceptable.
6. **Slug handling**: keep slug normalization/validation helpers from `slugService`. The form shows the normalized slug in real time but does not auto-generate it from the title to give users explicit control.

## Risks / Trade-offs

- [Risk] Emoji flags may render differently across OS/browsers. → Mitigation: this is acceptable for MVP; can later swap to SVG flag sprites.
- [Risk] Transliteration table for Cyrillic names is simple and may not match official passport transliteration. → Mitigation: users can edit the `en` field; transliteration is only a convenience fallback when `en` is empty.
- [Risk] Querying associations with an `or` filter requires a Firestore composite index if combined with ordering. → Mitigation: order client-side after fetching, or use two separate queries and merge results, avoiding composite indexes.
- [Risk] IP geolocation can fail or be inaccurate. → Mitigation: fallback to `BY`/empty already exists; keep it.

## Migration Plan

Not applicable — this is a pure front-end UX change. Existing tournament documents remain valid. After deployment, users editing drafts will see the new layout.

## Open Questions

- Should the `en` locale value stop auto-syncing once the user has manually edited it? (Proposed: yes — if `en` is non-empty, never overwrite it.)
- Should the country/city fallback remain `BY` or move to a project-wide default configured in `openspec/config.yaml`? (Not blocking; keep existing behavior.)
