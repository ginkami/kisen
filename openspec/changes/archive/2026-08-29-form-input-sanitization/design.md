## Context

All text inputs in the app's edit forms currently persist typed content verbatim into Firestore. React escapes output by default and no `dangerouslySetInnerHTML` usage exists, so stored content is not executed today. However:

- The `regulation-management` capability already specifies Markdown-capable descriptions, and Markdown renderers commonly allow raw HTML — meaning stored HTML would become executable the moment such a renderer is introduced.
- Any new client, import script, or future API consumer bypassing the React UI could write arbitrary content.
- The backend is Firestore (NoSQL): query values are always treated as literals by the SDK (no operator objects like MongoDB's `$gt`), so SQL/NoSQL operator injection is structurally impossible; queries are built exclusively with typed constraints (`where(field, '==', value)`).

Existing validation infrastructure: Zod schemas in `src/domain/*.ts` (`playerSchema`, `eventSchema`, `associationSchema`, `regulationSchema`, `publishedTournamentSchema`) are enforced via `schema.parse()` in the services on write and `.safeParse()` in repositories on read. Format-constrained fields already have strict validation (`uuidv7` ids, `isValidSlug` slugs, 2-letter country codes). No sanitization library is installed, and all text fields are plain text or Markdown — no rich-HTML rendering exists.

## Goals / Non-Goals

**Goals:**
- Silently strip HTML/script content from all persisted text fields at two layers: UI input (`onChange`) and service write path.
- Preserve Markdown syntax fully in `locales.<lang>.description` fields (tournament, event, association, regulation) so future Markdown rendering works.
- Neutralize dangerous URL schemes in Markdown link syntax (`javascript:`, `vbscript:`, `data:text/html`).
- Document the Firestore no-SQL-injection guarantee and the future-renderer contract.
- No new runtime dependencies.

**Non-Goals:**
- Server-side / Firestore-rules changes (rules already restrict writes to authorized roles).
- Rejecting input with validation errors — sanitization is silent (product decision).
- Migrating/scrubbing existing Firestore documents (none are expected to contain HTML; React escapes on render regardless).
- Rendering Markdown — that is a future change; this change only makes stored content safe for it.
- Search inputs in `AdminDrawer` and other non-persisted fields (low risk; can adopt the utility opportunistically).

## Decisions

### Decision 1: Lightweight custom utility instead of a sanitization library (DOMPurify)

**Choice:** New `src/utils/sanitize.ts` with `sanitizeTextInput(value: string): string` and `sanitizeDeep(value: unknown): unknown`.

**Rationale:** DOMPurify sanitizes HTML *for rendering*; our fields are plain text/Markdown that is never rendered as HTML. Stripping is done by: removing `<script…>…</script>` and `<style…>…</style>` blocks including content, then removing remaining tags via `<[^>]*>`, then removing NUL bytes and control characters except `\n` and `\t`. Markdown markers (`#`, `*`, `_`, backticks, `>`, `-`, `+`, `[]`, `()`, `!`, `~`, `|`) are plain characters and are untouched. A regex util (~40 lines) is auditable; a dependency for richer semantics we do not need is not justified.

**Alternatives considered:** DOMPurify (over-engineered, HTML-focused, new dependency); rejecting input with zod refinements (rejected by product decision: silent strip); DOM parsing (unnecessary complexity, requires document context in tests).

### Decision 2: Markdown link scheme neutralization on input

**Choice:** Case-insensitively replace `](javascript:`, `](vbscript:`, `](data:text/html` (with optional whitespace) so the scheme becomes `about:blank#`. Prose containing `javascript:` outside link syntax is untouched.

**Rationale:** The only Markdown-specific injection vector is link/image targets; rendering-time checks do not exist yet, and the sanitization layer is the last write gate. Safe schemes (`http:`, `https:`, `mailto:`) are untouched.

### Decision 3: Two application layers — UI `onChange` and service write path

**Choice:** Wrap `onChange` handlers with `sanitizeTextInput` in all persisted text inputs; additionally run `sanitizeDeep` over the write candidate before `schema.parse()` in `create`/`update` of the five services.

**Rationale:** UI-level stripping gives immediate feedback and keeps form state clean (including IndexedDB draft snapshots). Service-level deep sanitization is the authoritative gate that protects against UI-bypassing write paths, mirroring the existing `schema.parse()` safety-net pattern from the `part1-validation` change. Format-constrained fields (uuid, slug, country, dates) cannot contain `<` and are unaffected by deep sanitization.

**Alternatives considered:** Zod `.transform()` on schema string fields — would also run on repository *read* boundaries, mutating stored data on round-trip and risking corruption of legitimate legacy content; only-write-path application cannot be expressed in shared schemas cleanly.

### Decision 4: Document the injection model and the future-renderer contract

**Choice:** Document in `sanitize.ts` JSDoc and in this design: (a) Firestore treats query values as literals — SQL/NoSQL operator injection is not applicable, and query construction uses only typed constraints; (b) any future Markdown renderer MUST run with raw HTML disabled and an allow-list of link schemes (`http:`, `https:`, `mailto:`).

**Rationale:** The user-visible ask includes "SQL injections"; making the actual guarantee explicit prevents future misinterpretation and encodes the contract that keeps stored content safe.

## Risks / Trade-offs

- **[Risk] Over-stripping in `ExpandableField` (shared by all forms)** → Legitimate text containing `<` paired with `>` (e.g., «выбери <10> вариантов») loses the pseudo-tag. Accepted trade-off of the strip-on-input decision; edge cases are covered by unit tests to keep behavior intentional and documented.
- **[Risk] Aggressive strip mid-typing surprises users** → Since `<` alone is kept and only tag-shaped sequences are removed, ordinary typing (Cyrillic, umlauts, quotes, math) is unaffected; verified by tests.
- **[Risk] Regex-based tag stripping diverges from a future renderer's parsing** → Mitigated by the documented contract: future Markdown renderers must disable raw HTML, making stored-tag removal defense-in-depth rather than the only gate.
- **[Risk] Deep sanitization misses a new service** → New entities' services must call `sanitizeDeep` before `schema.parse()`; noted in tasks and conventions.
- **[Trade-off] Silent stripping gives no feedback** → Chosen deliberately (product decision); error-based rejection would require per-field i18n messaging for rare cases.

## Migration Plan

1. Land the utility + tests (pure addition, no behavior change yet).
2. Wire UI `onChange` in shared components first (`ExpandableField`), then form-specific inputs.
3. Add `sanitizeDeep` to the five services' write paths.
4. Rollback is trivial: each layer is an independent, additive change; removing the sanitization calls restores prior behavior. No data migration needed.

## Open Questions

None — product decisions (silent strip; Markdown preserved for tournament/event/association descriptions; regulation already Markdown per spec) were confirmed with the user.
