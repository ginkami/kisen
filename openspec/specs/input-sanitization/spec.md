## Purpose

Protection of persisted text data: silent stripping of HTML and control characters on input, tolerance of Markdown markup, neutralization of dangerous URL schemes in Markdown links, deep sanitization in services before schema validation, and injection safety of the persistence layer.

## Requirements

### Requirement: Text inputs are sanitized on entry

All persisted text inputs (single-line inputs and textareas) across the tournament, event, association, player, and regulation edit forms SHALL silently strip HTML content on every change: `<script>…</script>` and `<style>…</style>` blocks SHALL be removed together with their content, all remaining tag-shaped sequences (`<[^>]*>`) SHALL be removed, and NUL bytes and control characters (except `\n` and `\t`) SHALL be removed. The app SHALL NOT display a validation error for stripped content. Line breaks, tabs, and ordinary text (including Cyrillic, umlauts, quotes, and Markdown marker characters) SHALL be preserved.

#### Scenario: Script tag typed into a title field

- **WHEN** the user types `<script>alert(1)</script>Мой турнир` into a tournament title input
- **THEN** the form state contains `Мой турнир` (tag and payload removed silently)

#### Scenario: Self-contained tag with attributes

- **WHEN** the user types `<img src=x onerror=alert(1)>Пётр` into a participant name input and the form state is persisted
- **THEN** the stored value is `Пётр` (no `onerror` payload survives)

#### Scenario: Unclosed tag sequence

- **WHEN** the user types `<<script>alert(1)</script>Текст` into a description textarea
- **THEN** the form state contains `Текст` without any executable markup

#### Scenario: Ordinary text is untouched

- **WHEN** the user types `Фёдор, "Чемпион" 2026 — весна` (Cyrillic, quotes, punctuation) into any text input
- **THEN** the value passes through unchanged

#### Scenario: Control characters are removed

- **WHEN** a pasted value contains NUL bytes or other control characters plus newlines
- **THEN** newlines and tabs are preserved while NUL bytes and control characters are removed

### Requirement: Markdown is preserved in description fields

The `locales.<lang>.description` fields of tournaments, events, associations, and regulations SHALL tolerate Markdown markup: sanitization SHALL NOT remove or alter Markdown marker characters (`#`, `*`, `_`, backticks, `>`, `-`, `+`, `!`, `~`, `|`, brackets), lists, emphasis, code spans/blocks, or blockquotes. HTML embedded in Markdown SHALL still be stripped per the text-input sanitization rule.

#### Scenario: Markdown heading and emphasis survive

- **WHEN** the user types `# Заголовок\n\n**жирный** и _курсив_` into a tournament description textarea
- **THEN** the stored value is identical to the typed Markdown

#### Scenario: Lists, quotes, and code survive

- **WHEN** the user types `- пункт 1\n- пункт 2\n\n> цитата\n\n\`код\`` into an association description
- **THEN** the stored value is identical to the typed Markdown

#### Scenario: HTML inside Markdown is stripped

- **WHEN** the user types `# Турнир\n\n<script>alert(1)</script>Добро пожаловать` into a description
- **THEN** the stored value is `# Турнир\n\nДобро пожаловать`

### Requirement: Dangerous URL schemes in Markdown links are neutralized

When sanitized text contains a Markdown link or image target using a dangerous scheme (`javascript:`, `vbscript:`, or `data:` pointing to HTML), the scheme SHALL be replaced with a safe scheme marker (`about:blank#`) on input, case-insensitively. Prose mentioning a scheme outside Markdown link syntax SHALL be left unchanged. Safe schemes (`http:`, `https:`, `mailto:`) SHALL be untouched.

#### Scenario: javascript: link neutralized

- **WHEN** the user types `[нажми](JAVASCRIPT:alert(1))` into a description
- **THEN** the stored value is `[нажми](about:blank#alert(1))`

#### Scenario: Prose mention is preserved

- **WHEN** the user types `язык javascript: основы` into a description
- **THEN** the stored value is unchanged

#### Scenario: Safe schemes pass through

- **WHEN** the user types `[сайт](https://kisen.example) и [почта](mailto:info@kisen.example)`
- **THEN** the stored value is unchanged

### Requirement: Services sanitize deeply before persisting

The `create` and `update` methods of the tournament, player, event, association, and regulation services SHALL recursively apply text sanitization to all string fields of the write candidate (deep sanitization of nested objects and arrays) before Zod `schema.parse()` validation. This gate SHALL hold regardless of which client produced the input.

#### Scenario: UI-bypassing write path is sanitized

- **WHEN** `playerService.update` is called with `givenName` containing `<b>Иван</b>`
- **THEN** the value passed to the repository is `Иван`

#### Scenario: Nested localized strings are sanitized

- **WHEN** `tournamentService.create` is called with `locales.ru.description` containing `<script>x</script>Текст`
- **THEN** the candidate handed to `schema.parse()` contains `Текст` for that locale

#### Scenario: Format-constrained fields are unaffected

- **WHEN** deep sanitization runs on a candidate whose `id` is a UUIDv7, `country` is `JP`, and `slug` is `kisen-2026-open`
- **THEN** those fields pass through unchanged

### Requirement: Injection-safety of the persistence layer

The application's persistence layer SHALL remain immune to SQL/NoSQL operator injection: Firestore queries SHALL be built only with typed query constraints where values are treated as literals. SQL-like text (`'; DROP TABLE users; --`) entered by users SHALL be stored as ordinary text. Sanitization SHALL remove NUL bytes so that terminator-style payloads cannot embed control characters.

#### Scenario: SQL payload is stored as text

- **WHEN** the user types `'; DROP TABLE users; --` into a title field
- **THEN** the value is stored verbatim as text and later rendered as escaped plain text

#### Scenario: NoSQL operator-style payload is stored as text

- **WHEN** a form field receives `{"$gt": ""}`
- **THEN** the value is stored verbatim; Firestore treats it as a string literal, not an operator

### Requirement: Future Markdown rendering stays safe

Any future renderer of stored `description` fields SHALL NOT interpret stored HTML as markup: the sanitization contract documented in the utility code SHALL require raw-HTML-disabled rendering and an allow-list of link schemes (`http:`, `https:`, `mailto:`).

#### Scenario: Renderer contract is documented

- **WHEN** a developer opens `src/utils/sanitize.ts`
- **THEN** the JSDoc states the rendering contract (raw HTML disabled, scheme allow-list) that any Markdown renderer must follow
