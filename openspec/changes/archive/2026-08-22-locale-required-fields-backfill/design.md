## Context

All localized edit forms (regulation, event, association, player, tournament) round-trip a `locales: Record<SupportedLocale, ...>` in their form state. The save path filters/serializes locales before calling the service. The filter predicates are:

- regulation/event/association: keep locale iff `title.trim() !== ''`
- player: keep locale iff `familyName !== '' && givenName !== ''` (AND)
- tournament locales: no filtering (both locales always persisted); `publishedTournamentSchema` requires every present locale to have `min(1)` `title`/`location`, and the arbiter locale schema requires `min(1)` `familyName`/`givenName`
- tournament participants: keep locale iff `familyName !== '' || givenName !== ''` (OR)

Result: optional fields (description, location, club, title) entered for a locale with an empty required field are dropped on save; tournament publish throws a Zod error when only one locale is filled. Validation everywhere is "at least one locale with the required field", so the loss/failure is silent or confusing.

## Goals / Non-Goals

**Goals:**

- A single pure helper for "keep locales with any content + backfill empty required fields from the first locale providing a value".
- Apply it to the save paths of regulation, event, association, player, tournament (locales + arbiter + participants).
- Preserve the existing "at least one locale must provide the required field" validation (no source → still an error).
- No UI changes; backfilled values surface in the form after save via the existing form-state-refresh.

**Non-Goals:**

- Changing which locales are persisted for tournaments (both `ru`/`en` are always saved — unchanged).
- Per-field mixed-source backfill concerns (with two locales, "first locale with that field" is unambiguous).
- Public-facing rendering changes.
- Firestore rules/index/schema changes.

## Decisions

1. **Backfill in the save path, not the UI.** The helper runs inside `filterLocalesForSave`/`formStateTo*Input`/`buildLocalesForSave` so typing remains unconstrained. After save, hooks call `setFormState(*ToFormState(saved))`, so copied values appear in the secondary locale tab automatically. Alternative rejected: auto-filling fields on tab switch — surprises the user mid-edit and complicates dirty tracking.

2. **Keep-if-any-content, then backfill.** For regulation/event/association/player: first compute `localeHasAnyContent` on the **original** values to decide which locales to keep, then backfill required fields only for the kept locales. Backfilling before the keep decision would mark entirely-empty locales as "having content" (copied title) and keep them all. For tournaments (always-both-locales) backfill runs unconditionally for `title`/`location`/arbiter names — there are no "drop" decisions.

3. **Field-level source selection.** For each required field independently, the source is the first locale (in `supportedLocales` order: `ru`, then `en`) whose value for that field is non-empty after trim. This is deterministic and, with two locales, equivalent to "the other locale". Player `familyName`/`givenName` are backfilled independently (a locale may inherit `familyName` from `ru` and `givenName` from `en` if those differ — acceptable since they are independent fields).

4. **Tournament publish uses the same builders as save.** Extract `buildLocalesForSave` and `buildArbiterForSave` in `useTournamentForm` and call them in both `formStateToUpdateInput` and the `publishMutation` candidate. This removes the divergence where publish built raw `formState.locales`/arbiter and could fail the `publishedTournamentSchema.parse`.

5. **Validation unchanged.** `hasTitle`/`hasLocation`/`hasArbiter`/player "both names somewhere" checks stay on original values; backfill only happens after validation passes, so a tournament with no title anywhere still errors before publish.

## Risks / Trade-offs

- [Tournament drafts now persist backfilled secondary-locale fields (non-empty where previously empty)] → intended; keeps publish valid and consistent with "don't burden the user". Old drafts with empty secondary locales remain valid (schema `default('')`).
- [Player `title` top-level field derives from `Object.keys(player.locales)[0]`] → unaffected; `playerToFormState` still picks the first present locale.
- [Backfill copies user content across locales without explicit consent] → acceptable for an organizer tool where the same content typically applies to both locales; the user can still edit the copied value afterward.

## Migration Plan

None. No schema changes; existing documents parse unchanged. New saves produce richer locale data; old documents with partial locales data are not rewritten.