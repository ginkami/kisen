## Why

The «Описание» (Description) tab on the public tournament page (`TournamentPage`) is still a stub (the `tournament-public-page` spec left its behavior "to be defined later"): when the tab is active, an empty `div` is rendered, even though the tournament, its parent event, and attached regulations all carry Markdown descriptions. This content should be shown as a single safely rendered Markdown block.

## What Changes

- The «Описание» tab of the public tournament page renders Markdown content in order: parent event description → tournament description → parent event regulations' descriptions → tournament regulations' descriptions (for tournaments with `parentEvent`; no block labels are shown — content only).
- Regulations attached to both the tournament and its parent event are displayed once (the tournament's copy takes precedence).
- Markdown content is split by headings (h1–h6) into collapsible sections based on daisyUI `collapse` (with an arrow icon, arbitrary nesting); content without headings renders without collapse blocks.
- Content localization: `locales.<lang>` with a fallback to `ru`, consistent with other fields on the page.
- A reusable Markdown renderer is added that honors the `input-sanitization` spec contract: raw HTML disabled; link schemes restricted to the `http:`/`https:`/`mailto:` allow-list.
- An empty tab (no descriptions, no regulations) renders empty, as today.

## Capabilities

### New Capabilities

- `markdown-rendering`: a reusable safe Markdown renderer for React — Markdown rendered without raw HTML, link scheme allow-list (`http:`/`https:`/`mailto:`), content split by headings into (nested) daisyUI collapse sections.

### Modified Capabilities

- `tournament-public-page`: the «Описание» tab renders the tournament, parent event, and regulation descriptions instead of a placeholder, with a fixed source order, regulation deduplication, and locale fallback.

## Impact

- **Code**: `src/pages/TournamentPage.tsx` (replacing the tab stub); new components and utilities in `src/components/tournament/view/` and `src/utils/`; new query hooks for regulations (`regulationService.getById`, public reads already allowed by Firestore rules).
- **Dependencies**: adding `react-markdown` + `remark-gfm` (Markdown→React without `dangerouslySetInnerHTML`).
- **Tests**: new unit tests for the section-splitting utility; link sanitization checks in rendering; regression via `npx tsc --noEmit` and `npx vitest run`.
- **i18n**: updates to `src/locales/{ru,en}/translation.json` if any user-facing strings are introduced.