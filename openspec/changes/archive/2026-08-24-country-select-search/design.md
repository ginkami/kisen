## Context

`CountrySelect` (`src/components/tournament/CountrySelect.tsx`) is a DaisyUI dropdown: a trigger button showing the selected country + SVG flag, and a `dropdown-content menu` list of ~250 localized countries (`getCountryList(lang)`) with an optional placeholder clear-item. Open/close is component-controlled via the `isOpen` state (`dropdown-open` class). Five call sites reuse the component without extra props.

## Goals / Non-Goals

**Goals:**

- Text filter over the country list inside the dropdown: match by localized name or ISO code, case-insensitive.
- Search input pinned at the top of the scrollable list (visible while scrolling), auto-focused on open, query reset on each open.
- Empty-state hint when nothing matches; placeholder clear-item only visible when not filtering.
- Zero API changes — existing props/call sites untouched.

**Non-Goals:**

- Keyboard navigation (arrow keys/Enter) in the list — DaisyUI `menu` items are buttons; native Tab works.
- Debounce — the list is small enough for synchronous filtering.
- Searching in alternative languages (e.g. typing English names while the UI is Russian) — the filter works on the currently displayed localized names plus the ISO code, which already covers common cases ("ru", "us", "de").

## Decisions

1. **Filter by `name` OR `code`, case-insensitive `includes`.** The ISO code match makes quick keyboard input ("jp") work regardless of the UI language and of long localized names. Alternative rejected: name-only filtering — "US" would not match "США" in the Russian locale.

2. **Sticky search row inside `dropdown-content`.** A `li` with `sticky top-0 z-10 bg-base-100 p-2` wrapping the `input input-sm` keeps the field visible while scrolling the `max-h-64` list. Alternative rejected: input outside the list — would visually detach from the menu and require layout changes at call sites.

3. **Reset + autofocus on open.** A `useEffect` on `isOpen` clears `search` and focuses the input via a ref. Fresh query each time matches user expectations; the focus removes an extra click. Clicking inside the input must not close the dropdown — the open state is component-controlled (`isOpen`), and no close-on-outside-click handler exists today, so typing is safe.

4. **Placeholder clear-item hidden while filtering.** When the user types, they are looking for a country, not for the "not selected" option; hiding it reduces noise. It reappears when the query is cleared.

5. **Empty state as a disabled `li`.** A plain `<li>` with the `noResults` translation and muted styling; not clickable.

## Risks / Trade-offs

- [Input focus steal when the dropdown opens] → intended; the only reason to open the dropdown is to find a country. `autoFocus` on the input also works but ref-focus in the effect keeps it explicit.
- [Filter runs on every keystroke over ~250 items] → negligible cost (string `includes`), no memoization of the list itself needed beyond the existing `useMemo`.

## Migration Plan

None. Pure presentational change inside one component; no schema, storage, or API impact.