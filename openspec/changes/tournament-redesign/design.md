## Context

The `tournament` entity currently carries an `isOnline` boolean, a nullable `country`, and an `arbiters: Arbiter[]` array. These fields introduce branching UI logic and validation paths that are not essential for the MVP. The product decision is to simplify the model:

- Always require a physical or organizing country.
- Represent the chief arbiter as a single localized name object instead of a list of full arbiter records.
- Drop the online/offline distinction from the tournament data model entirely.

This change touches the domain schema, the tournament service, the form hook, the edit UI, translations, and the OpenSpec project context.

## Goals / Non-Goals

**Goals:**
- Simplify the tournament Zod schema and TypeScript types.
- Pre-fill `country` and `locales.*.location` from the user's IP when a draft is created.
- Update the editing form to remove the online flag and the Arbiters tab.
- Keep domain, service, hook, component, i18n, and OpenSpec context consistent with `schemas/tournament.jsonс`.

**Non-Goals:**
- No changes to tournament statuses, publishing flow, or Firestore security rules.
- No new Cloud Functions or backend endpoints.
- No full UI for editing the chief arbiter in this change (schema only).

## Decisions

1. **IP geolocation helper inside `TournamentService`**
   - Add a small private async helper `detectLocationByIp()` that calls a public IP info service (e.g. `https://ipapi.co/json/`) with a short timeout.
   - Returns `{ country: string; city: string }`.
   - Fallback to `{ country: 'BY', city: '' }` on any failure so draft creation never blocks.
   - *Rationale*: Keeps the capability self-contained in the service layer; no new external dependency package; easy to replace later with a backend endpoint.

2. **`country` required at the schema level**
   - `country` becomes `z.string().length(2)` in `tournamentSchema` and `publishedTournamentSchema`.
   - *Rationale*: The JSONC spec marks it required; enforcing it in Zod catches invalid data early.

3. **Single chief arbiter instead of array**
   - Replace `arbiters: z.array(arbiterSchema).default([])` with `arbiter: arbiterSchema` where `arbiterSchema` only contains `locales` with `familyName` and `givenName`.
   - *Rationale*: Matches the simplified JSONC spec; removes unused fields (`isChief`, `nationality`, `residence`).

4. **Remove `isOnline` completely**
   - Remove from domain schema, service inputs, form state, UI, and i18n.
   - Country selection is always visible in the form.
   - *Rationale*: Eliminates the online/offline branch and makes country a first-class required field.

5. **No spec file for `ip-location-detection`**
   - The new capability is a small internal service helper, not a user-facing feature with complex requirements.
   - *Rationale*: Avoid over-documenting a simple utility; requirements are captured in the design and tasks.

## Risks / Trade-offs

- **[Risk] External IP service may be unavailable or rate-limited.** → Mitigation: wrap call in `try/catch` with a fallback; never block draft creation.
- **[Risk] IP-based city/country may be inaccurate (VPNs, proxies).** → Mitigation: values are defaults only; the user can edit them before publishing.
- **[Risk] Existing tournament documents in Firestore still contain `isOnline` and `arbiters`.** → Mitigation: this is an MVP with no production users yet; migration is not required. If needed later, a one-time migration script can normalize old documents.
- **[Risk] Removing `isOnline` breaks assumptions elsewhere (e.g. conditional venue labels).** → Mitigation: search the codebase for `isOnline`, `arbiters`, and related keys; update all occurrences in one change.

## Migration Plan

No deployment or database migration needed. Old fields will simply be ignored by the new code. When existing tournaments are next saved, the new shape will be written.

## Open Questions

None.
