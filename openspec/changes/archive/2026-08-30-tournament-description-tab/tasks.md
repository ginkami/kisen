## 1. Dependencies and preparation

- [x] 1.1 Add dependencies `react-markdown` and `remark-gfm` (`npm install react-markdown remark-gfm`)
- [x] 1.2 Check available icons (`@heroicons/react` / actual `Bs*` usage in the project) and pick an arrow icon for the collapse title

## 2. Section-splitting utility

- [x] 2.1 Create `src/utils/markdownSections.ts`: types `MarkdownSection` and function `buildMarkdownSections(md)` — line-based parsing of ATX headings `^#{1,6}\s`, nesting tree by heading level, fenced block tracking (``` / ~~~), content without headings → a single node without a heading
- [x] 2.2 Create `src/test/markdownSections.test.ts`: scenarios from the `markdown-rendering` spec — splitting by headings, nesting, sibling sections, a document without headings, `#` inside code fences, empty input

## 3. Markdown rendering components

- [x] 3.1 Create `src/components/tournament/view/MarkdownContent.tsx`: a wrapper over `ReactMarkdown` with `remarkGfm`, a custom `urlTransform` (allow-list `http:`/`https:`/`mailto:` plus relative/fragment URLs), an `a` override (`target="_blank"`, `rel="noreferrer"`), and base styles for headings/lists/tables/code
- [x] 3.2 Create `src/components/tournament/view/MarkdownCollapsibleSections.tsx`: recursive rendering of the section tree — `<details class="collapse collapse-arrow group">` + `<summary class="collapse-title">` (arrow icon at the start, `group-open:rotate-180`) + `collapse-content` with `MarkdownContent` and nested sections; a tree of a single node without a heading → plain `MarkdownContent`

## 4. «Описание» section on the tournament page

- [x] 4.1 Create `src/components/tournament/view/TournamentDescriptionSection.tsx`: assemble content in the order «event description → tournament description → event regulations → tournament regulations» with the locale fallback `locale → ru`, filtering out empty chunks, joined with `\n\n`
- [x] 4.2 Add regulation loading: `useQueries` over the deduplicated union of ids (`event.regulations` minus `tournament.regulations`), `queryKey: ['regulation', id]`, `queryFn: () => regulationService.getById(id)`, ordered by the source arrays
- [x] 4.3 Replace the stub `{activeTab === 'description' && <div />}` in `src/pages/TournamentPage.tsx` with `<TournamentDescriptionSection>` (empty data → render `null`)
- [x] 4.4 Verify/add i18n keys in `src/locales/{ru,en}/translation.json` if any user-facing strings appear

## 5. Tests and validation

- [x] 5.1 Rendering test for `MarkdownContent`: a `javascript:` link renders without a usable href; `http:`/`https:`/`mailto:` are preserved; an external link has `target="_blank"` + a safe `rel`; raw HTML (`<script>`, `<img onerror>`) creates no elements
- [x] 5.2 Rendering test for `MarkdownCollapsibleSections`: collapse blocks per headings, nesting, sibling sections, no collapse when content has no headings
- [x] 5.3 Test for `TournamentDescriptionSection`: source order, regulation deduplication, standalone tournament, locale fallback, empty render (mocked `regulationService`)
- [x] 5.4 Run `npx tsc --noEmit` and `npx vitest run` (baseline: only the 2 known Firebase-mock failures); `openspec validate --changes`
- [x] 5.5 Manual check on the public tournament page: Markdown with headings h1–h6 and nesting, tables/lists, links with disallowed schemes, a tournament with and without `parentEvent`
