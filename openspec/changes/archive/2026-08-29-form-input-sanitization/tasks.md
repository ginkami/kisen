## 1. Sanitization utility

- [x] 1.1 Create `src/utils/sanitize.ts` with `sanitizeTextInput(value: string): string`: remove `<script…>…</script>` and `<style…>…</style>` blocks with content, remove remaining tags via `<[^>]*>`, remove NUL bytes and control characters (keep `\n`/`\t`); JSDoc documents the Firestore literal-value guarantee and the future-renderer contract (raw HTML disabled; link-scheme allow-list `http:`, `https:`, `mailto:`)
- [x] 1.2 In `sanitizeTextInput`, neutralize dangerous Markdown link schemes case-insensitively: `](javascript:`, `](vbscript:`, `](data:text/html` → `](about:blank#`
- [x] 1.3 Add `sanitizeDeep(value: unknown): unknown` recursively sanitizing all strings in nested objects/arrays/records (non-string primitives and Dates pass through)
- [x] 1.4 Create `src/test/sanitize.test.ts`: script/style blocks (with content), attribute-bearing tags, unclosed tags, Markdown preservation (headings, emphasis, lists, quotes, code), scheme neutralization + prose-preservation + safe schemes, SQL/NoSQL payloads stored as text, control-character stripping, Cyrillic/umlaut passthrough, `sanitizeDeep` on nested form-state shapes

## 2. UI input layer

- [x] 2.1 Wire `sanitizeTextInput` into `ExpandableField.tsx` onChange (covers input + textarea description fields across tournament/event/association/regulation forms)
- [x] 2.2 Wire `sanitizeTextInput` into `ParticipantRow.tsx` (familyName, givenName, title, location) and `PlayerInfoSection.tsx` text inputs
- [x] 2.3 Wire `sanitizeTextInput` into `TournamentEditForm.tsx` (title, arbiter inputs, schedule `ScheduleEventCombobox` handleTextChange) and `TournamentLocationInput.tsx` (venue, settlement)
- [x] 2.4 Wire `sanitizeTextInput` into `AssociationInfoSection.tsx` (title, country, location) and `EventEditForm.tsx` (title, slug-adjacent text inputs; slug keeps its own `isValidSlug` validation)
- [x] 2.5 Verify `RegulationEditForm.tsx` description goes through `ExpandableField` and add any remaining direct text inputs

## 3. Service write layer

- [x] 3.1 `playerService.ts`: `sanitizeDeep` candidate before `playerSchema.parse()` in `create` and `update` (and import-from-list path if it persists user text)
- [x] 3.2 `tournamentService.ts`: `sanitizeDeep` before `schema.parse()` in `create`, `createDraft`, `update`, and `publish` (publish delegates to update, so it is covered by the update gate)
- [x] 3.3 `eventService.ts` and `associationService.ts`: `sanitizeDeep` before `schema.parse()` in `create`/`update`
- [x] 3.4 `regulationService.ts`: `sanitizeDeep` before `schema.parse()` in `create`/`update`

## 4. Validation

- [x] 4.1 Run `npx tsc --noEmit` — must be clean
- [x] 4.2 Run `npx vitest run` — new sanitize tests pass; no regressions beyond the 2 pre-existing Firebase-mock failures (`useTournamentForm.test.ts`, `App.test.tsx`)
- [x] 4.3 Manual smoke in dev app: paste `<script>alert(1)</script>` into tournament title and description → tags silently stripped; Markdown (`#`, `**`, `-`, `>`, `[x](https://…)`) survives in descriptions
