## Context

The «Описание» (Description) tab on `TournamentPage` is a stub (`{activeTab === 'description' && <div />}`). The archived `input-sanitization` spec mandates that any Markdown rendering: raw HTML disabled, link scheme allow-list `http:`/`https:`/`mailto:`; `src/utils/sanitize.ts` already cleans data on write, but the renderer must act as a second line of defense.

Content sources: `tournament.locales.<lang>.description`, `event.locales.<lang>.description` (the event via `parentEvent`, already loaded by the page), regulations — `tournament.regulations` / `event.regulations` (arrays of ids) → `regulationService.getById(id)`; Firestore rules allow public reads of regulations. No Markdown renderer exists in the project yet.

## Goals / Non-Goals

**Goals:**
- Fill the «Описание» tab with content in the agreed order, without block labels.
- A reusable, safe Markdown renderer with heading-based collapse sections (arbitrary nesting).
- Minimal number of new dependencies and Firestore requests.

**Non-Goals:**
- Empty-state placeholders/messages for missing data (the tab stays empty).
- Setext headings, syntax highlighting in code blocks, the `@tailwindcss/typography` plugin.
- Changes to edit forms or the data schema.

## Decisions

### Decision 1: react-markdown + remark-gfm instead of marked/DOMPurify or a hand-rolled remark pipeline
`react-markdown` renders Markdown into React elements without `innerHTML`: raw HTML is disabled by default (no `rehype-raw`), and URLs are filtered through a pluggable `urlTransform` (custom allow-list `http:`/`https:`/`mailto:` plus relative URLs). This maps exactly onto the `input-sanitization` contract without manual HTML sanitization. The `marked`+`DOMPurify` alternative requires `dangerouslySetInnerHTML` and is harder to test; a raw `unified` pipeline yields an mdast that would still need to be rendered manually.

### Decision 2: Line-based section parser over ATX headings, not AST transformation
The utility `buildMarkdownSections(md)` in `src/utils/markdownSections.ts` walks lines: `^#{1,6}\s` starts a section with a level and heading text; content accumulates in `raw`; the tree is built from heading levels (a stack). Fenced code blocks (``` / ~~~) are tracked so that `#` inside code is not treated as a heading. Sections render from the original Markdown text through the same `react-markdown` — no need to parse and reassemble an AST. A pure function, covered by unit tests. Setext headings are intentionally unsupported.

### Decision 3: daisyUI collapse based on `<details>/<summary>` (not the radio/checkbox variant)
Only the native `<details>` element works correctly with arbitrarily nested collapse blocks and requires no unique names. Markup: `<details className="collapse group">` + `<summary className="collapse-title">` (own caret icon at the start of the heading line, rotating on open via `group-open:rotate-180`; the daisyUI `collapse-arrow`/`collapse-plus` indicators are not used since they render at the end and would duplicate the caret) + `<div className="collapse-content">`. daisyUI 5 styles `details.collapse` out of the box.

### Decision 4: Concatenate sources into a single Markdown string
The `TournamentDescriptionSection` component joins non-empty chunks (event description, tournament description, regulation descriptions) into one string with `\n\n` and feeds it to the shared renderer — headings from all sources participate in a single section tree. Regulations are loaded via TanStack `useQueries` over the deduplicated union of ids (`event.regulations` minus `tournament.regulations` — intersections render the tournament's copy), ordered by the source arrays. Locale: `locales[locale] ?? locales.ru`.

### Decision 5: Markdown styling via component overrides, no typography plugin
We override `a` (`target="_blank"`, `rel="noreferrer"`), headings, lists, tables, and code with minimal Tailwind classes. We do not add `@tailwindcss/typography` — fewer dependencies and full control over the look inside collapses.

## Risks / Trade-offs

- [The line-based parser does not cover exotic Markdown cases (setext, `#` in indented code)] → Inputs are sanitized on write and authored through a single editor; unit tests pin behavior on realistic examples; the parser degrades gracefully on unknown syntax (it simply creates no section).
- [N separate `getById` requests for regulations] → N is small (a handful of regulations per tournament), TanStack caches by `['regulation', id]`; a batch repository method can be added later if needed.
- [User-provided headings inside collapses may visually duplicate the page structure] → Acceptable: collapse blocks start collapsed (native `<details>` behavior), giving an "overview with expand-on-interest" experience.
- [An empty tab when no content exists may look like a bug] → Confirmed product decision: render emptiness, as the current stub does.

## Open Questions

None — product decisions (no block labels, regulation content without titles, empty tab without messages) were confirmed with the user.