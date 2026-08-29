## Why

All form text inputs currently persist any content the user types — including HTML tags, embedded scripts, and injection-style payloads. React escapes output today, so stored content is not currently rendered as HTML, but nothing prevents dangerous content from being written to Firestore (e.g., by future renderers such as the already-specified Markdown descriptions, new clients, or API consumers). A shared, defense-in-depth sanitization layer closes this gap before more rich-text surfaces (Markdown in `locales.<lang>.description`) are added.

## What Changes

- Add a shared sanitization utility (`src/utils/sanitize.ts`) with `sanitizeTextInput()` — strips HTML tags (including `<script>…</script>` and `<style>…</style>` with their content), control characters, and NUL bytes — while fully preserving Markdown syntax (`#`, `**`, `_`, backticks, `>`, lists, links).
- Neutralize dangerous URL schemes in Markdown links (`[x](javascript:…)`, `vbscript:`, `data:text/html`) by replacing the scheme on input.
- Apply `sanitizeTextInput()` on every text input's `onChange` across all edit forms (tournament, event, association, player, regulation): `ExpandableField`, `ParticipantRow`, `TournamentEditForm` (+ schedule combobox), `TournamentLocationInput`, `PlayerInfoSection`, `AssociationInfoSection`, `EventEditForm`, `RegulationEditForm`.
- Apply deep sanitization (`sanitizeDeep()`) at the service layer before Zod `schema.parse()` in `create`/`update` of `tournamentService`, `playerService`, `eventService`, `associationService`, `regulationService` — protecting against UI-bypassing write paths.
- Document that Firestore (NoSQL) treats query values as literals, so SQL/NoSQL operator injection is not applicable; format-constrained fields (`uuid`, `slug`, 2-letter `country`) already have strict Zod validation.
- Add unit tests covering script/HTML stripping, SQL-payload pass-through (harmless as text), Markdown preservation, and scheme neutralization.
- Sanitization is **silent** (strip on input): users cannot type `<script>` into any text field; no error messages are shown.

## Capabilities

### New Capabilities
- `input-sanitization`: Cross-cutting behavior for all persisted text fields: silent HTML/script stripping on input and at the service layer, Markdown preservation for `description` fields, neutralization of dangerous URL schemes in Markdown links, and the no-SQL-injection guarantee of the Firestore data layer.

### Modified Capabilities

## Impact

- **New code**: `src/utils/sanitize.ts`, `src/test/sanitize.test.ts`.
- **Modified UI**: `src/components/tournament/ExpandableField.tsx`, `ParticipantRow.tsx`, `TournamentEditForm.tsx`, `TournamentLocationInput.tsx`, `ScheduleEventCombobox.tsx`; `src/components/player/PlayerInfoSection.tsx`; `src/components/association/AssociationInfoSection.tsx`; `src/components/event/EventEditForm.tsx`; `src/components/regulation/RegulationEditForm.tsx`.
- **Modified services**: `src/services/{tournamentService,playerService,eventService,associationService,regulationService}.ts`.
- **No new dependencies** — a lightweight custom utility suffices (all text fields are plain text / Markdown; no rich-HTML rendering exists or is planned without raw-HTML-safe renderers).
- **No Firestore security rule changes**; `firestore.rules` already restricts writes to authorized roles.
- **Future contract**: any future Markdown renderer must run with raw HTML disabled and an allow-list of link schemes (`http:`, `https:`, `mailto:`); this contract is documented in the sanitization utility.
