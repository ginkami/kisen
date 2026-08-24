## 1. Component

- [x] 1.1 `src/components/tournament/CountrySelect.tsx`: add `search` state + `searchInputRef`; `useEffect` on `isOpen` — reset `search` to `''` and focus the input
- [x] 1.2 Add `filteredCountries` `useMemo`: empty query → full list; else `name.toLowerCase().includes(q) || code.toLowerCase().includes(q)` (q = `search.trim().toLowerCase()`)
- [x] 1.3 Render search row at the top of `dropdown-content`: `<li className="sticky top-0 z-10 bg-base-100 p-2">` with `<input className="input input-sm input-bordered w-full" placeholder={t('common.search')} />`; clicking inside the input must not close the dropdown (open state is component-controlled — no changes needed)
- [x] 1.4 Placeholder clear-item renders only when the query is empty; render empty-state `<li>` with `t('common.noResults')` when `filteredCountries.length === 0` and the query is non-empty; map `filteredCountries` instead of `countries`
- [x] 1.5 Add `useTranslation` hook to the component for the two new keys

## 2. Localization

- [x] 2.1 `src/locales/ru/translation.json`: `common.search` = «Поиск...», `common.noResults` = «Ничего не найдено»
- [x] 2.2 `src/locales/en/translation.json`: `common.search` = "Search...", `common.noResults` = "No results found"

## 3. Verification

- [x] 3.1 Run `npx tsc --noEmit` — no type errors
- [x] 3.2 Manual check: search by localized name (ru + en locales), by ISO code ("jp"/"ru"/"us"), sticky input visible while scrolling, empty-state hint, query resets + autofocus on reopen, placeholder clear-item hidden while filtering, all 5 call sites work (tournament country, player nationality/residence, participant nationality/residence)

## 5. Bugfix: dropdown closes on selection (post-QA)

- [x] 5.1 `CountrySelect.tsx`: wrap `<ul>` in conditional render `{isOpen && ...}` so the list is removed from DOM when closed
- [x] 5.2 Add `document.activeElement?.blur()` in `handleSelect` for immediate focus release
- [x] 5.3 Add scenario "Selecting a country closes the dropdown" to delta spec
- [x] 5.4 `tsc --noEmit` clean

## 6. Bugfix 2: dropdown open regression (post-QA)

- [x] 6.1 Remove conditional render `{isOpen && ...}` — `<ul>` always in DOM (restore working open via `dropdown-open`/`:focus-within` CSS)
- [x] 6.2 Add `onBlur={handleBlur}` on `div.dropdown`: close when `relatedTarget` is outside the container (fixes close-on-select via blur)
- [x] 6.3 `tsc --noEmit` clean

## 4. Docs

- [x] 4.1 Mark tasks complete and archive the change via /opsx:archive after user acceptance