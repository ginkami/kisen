## Purpose

Define the reusable, security-safe Markdown rendering used by public content sections: GFM rendering with raw HTML disabled, a link scheme allow-list, and heading-based collapsible sections.

## Requirements

### Requirement: Markdown rendering without raw HTML

The system SHALL provide a reusable Markdown renderer for React that renders GitHub-Flavored Markdown. Raw HTML in Markdown content SHALL NOT be rendered as markup: HTML tags and comments SHALL appear as plain text or be dropped, and SHALL never be interpreted or executed. The renderer SHALL NOT use `dangerouslySetInnerHTML`-based pipelines without sanitization.

#### Scenario: Script tag in content

- **WHEN** the content contains `<script>alert(1)</script>Текст`
- **THEN** the script markup is not rendered as an executable element and the remaining text content is displayed

#### Scenario: Image with event handlers

- **WHEN** the content contains an inline HTML `<img>` tag with an `onerror` attribute
- **THEN** no `<img>` element is created and no event handler executes

### Requirement: Markdown link scheme allow-list

The renderer SHALL restrict link and image URL schemes to `http:`, `https:`, and `mailto:`; relative and fragment URLs (`#…`, `/…`) SHALL be allowed. Any other scheme (e.g. `javascript:`, `data:`, `vbscript:`) SHALL be stripped so that the element renders without a usable URL target. External links SHALL open in a new tab with `rel` protecting against reverse tabnabbing.

#### Scenario: Allowed schemes preserved

- **WHEN** the content contains links with `http:`, `https:`, and `mailto:` URLs
- **THEN** all three render as links with their targets intact

#### Scenario: Disallowed scheme stripped

- **WHEN** the content contains a link with a `javascript:` URL
- **THEN** the rendered element has no usable URL target and no navigation occurs

#### Scenario: External link attributes

- **WHEN** the content contains a link to an external `https:` page
- **THEN** the link opens in a new tab with a safe `rel` policy

### Requirement: Heading-based collapsible sections

The renderer SHALL split Markdown content into sections by ATX headings (`#`–`######`, levels 1–6) and render each heading's section as a daisyUI `collapse` block whose title shows an arrow indicator at the start of the heading text that rotates when the block expands. Nested headings SHALL produce nested collapse blocks with arbitrary nesting depth. Content without any heading SHALL render as plain Markdown without a collapse block. Heading-like lines inside fenced code blocks SHALL NOT be treated as headings. Setext headings are not required to be supported.

#### Scenario: Sections split by headings

- **WHEN** the content contains an `h1` heading, two paragraphs, an `h2` heading, and one paragraph
- **THEN** two collapse blocks render: the first titled with the `h1` text containing both paragraphs, the second (nested inside the first) titled with the `h2` text containing the last paragraph

#### Scenario: Sibling sections at the same level

- **WHEN** the content contains two consecutive `h2` headings at the top level
- **THEN** two sibling collapse blocks render, neither nested inside the other

#### Scenario: Content without headings

- **WHEN** the content contains only paragraphs and lists
- **THEN** the content renders as plain Markdown with no collapse blocks

#### Scenario: Hash signs inside code fences

- **WHEN** the content contains a fenced code block whose lines start with `#`
- **THEN** no collapse block is created from those lines and they render as code

#### Scenario: Collapse interaction

- **WHEN** the user clicks a collapse block's title
- **THEN** the block toggles between collapsed and expanded states
