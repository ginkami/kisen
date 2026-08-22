## Context

The crosstable (`CrosstableSection.tsx` + pure model `crosstableModel.ts`) renders one column per configured tie-break from `settings.tieBreaks`. Column headers currently use the hardcoded export `TIEBREAK_ABBR: Record<TieBreakType, string>` (Latin: Pts/BH/BHC/BHM/BH+/SB/DE/W) — locale-independent and diverging from the dictionary `schemas/tieBreaks.jsonс`, which defines per-locale abbreviations (ru: «Очки», «Бухг.», «УБ», «МБ», «Бухг.+», «Берг.», «ЛВ», «ЧВ», «СЛБ»; en: Pts/BH/BHC1/MCH/BH+/SB/DE/WIN/SL Pts) and already declares a new coefficient `sl_points` («СЛ Баллы» / "SL Points") with no implementation.

The domain schema lives in `src/domain/tieBreak.ts` (zod enum + discriminated union); `schemas/tieBreak.ts` is its documentation mirror and `schemas/*.jsonс` files are human-readable dictionaries not imported by the app (the Cyrillic extension is the folder's convention and is not resolvable by Vite). The Settings-tab tie-break dropdown is generated from `tieBreakTypeSchema.options`, so a new enum member appears there automatically once a translation key exists. `computeStandings` fills `tieBreakValues: Record<TieBreakType, number>` and sorts rows by the configured tie-break chain; the `tieBreaksSchema` invariant guarantees `points` is always the first element.

## Goals / Non-Goals

**Goals:**

- Locale-dependent tie-break column headers: values from the i18n dictionary (aligned with `schemas/tieBreaks.jsonс`), rendered via `t('tournament.tieBreak.abbr.<type>')`, with a `cutCount` suffix for `buchholz_cut` entries (e.g. «УБ1» / «BHC1») because multiple cut entries must be distinguishable.
- Remove `TIEBREAK_ABBR` from the model (localization belongs to the i18n layer, not the pure model).
- New tie-break type `sl_points` in the domain schema + documentation mirror + calculable in `computeStandings`.
- SL Points logic: score groups by points descending; each group's value determined by the smallest position of any member in the overall points-sorted list; mapping 1→55, 2→34, 3→21, 4→13, 5→8, 6→5, 7→3, 8→2, 9+→1; all members of a group share the value.

**Non-Goals:**

- Importing `schemas/tieBreaks.jsonс` at runtime (documentation-only folder; values are transcribed into `src/locales/{ru,en}/translation.json`).
- Changing existing tie-break calculators, the sort chain mechanics, or `tieBreaksSchema` invariants (`points` first, unique types except `buchholz_cut`).
- Persisting computed SL Points — like all tie-breaks it is derived on the fly from games.
- Firestore schema/rules/index changes (a new optional enum member is backward compatible for reads; old clients that never write `sl_points` are unaffected).

## Decisions

1. **Abbreviations as i18n keys `tournament.tieBreak.abbr.<type>`, not a model map.** The pure model must not own localized strings; react-i18next already types keys via `src/types/i18next.d.ts` (`CustomTypeOptions`), so a missing key is a compile-time error. Alternative rejected: keep `TIEBREAK_ABBR` but make it `Record<TieBreakType, Record<SupportedLocale, string>>` — duplicates the i18n dictionary in the model and bypasses the typed translation pipeline.

2. **`cutCount` suffix rendered in the component, not stored in translations.** For `buchholz_cut` the header renders `${t('...abbr.buchholz_cut')}${cutCount}` (e.g. «УБ1», «BHC2»). The dictionary's "BHC1" is the default-cut case; a suffix composed at render time covers multiple cut entries without exploding the key space. Alternative rejected: `abbr.buchholz_cut_<n>` keys — unbounded key set.

3. **SL Points computed from a points→value map built once per `computeStandings` call.** Because `points` is guaranteed to be the first tie-break and all calculators run against the same precomputed `pointsMap`, the "smallest position of a score group in the overall sorted list" equals `1 + number of participants with strictly more points`. Implementation: collect distinct points values, sort descending, take each value's 1-based index in that distinct-descending list as the group position, map through `SL_POINTS_BY_POSITION = [55, 34, 21, 13, 8, 5, 3, 2]` with index ≥ 8 → 1. All members of a group receive the same value. Alternative rejected: computing per-participant ranks from the final sorted rows — the SL value depends only on points, so using the final row order (which already includes other tie-breaks) would leak non-points criteria into an explicitly points-only coefficient.

4. **SL Points participates in the sort chain like any other tie-break, without special-casing.** By construction it is monotone non-increasing with respect to points (a higher-points group never gets a lower value), so it never contradicts `points`; within a score group values are equal and the next chain element decides.

5. **`sl_points` extends the zod enum and union; no schema migration.** `tieBreakTypeSchema` gains `'sl_points'` and `tieBreakSchema` gains `baseTieBreakSchema.extend({ type: z.literal('sl_points') })`. Stored tournaments without `sl_points` parse unchanged; new drafts only contain it when the organizer adds it. The Settings dropdown (`tieBreakTypeSchema.options` minus already-used unique types) picks it up automatically; the uniqueness rule ("only one instance per type except `buchholz_cut`") covers it for free.

6. **Translation keys per locale from the dictionary.** `abbr`: ru «Очки», «Бухг.», «УБ», «МБ», «Бухг.+», «Берг.», «ЛВ», «ЧВ», «СЛБ»; en "Pts", "BH", "BHC", "MCH", "BH+", "SB", "DE", "WIN", "SL Pts". Full names (`tournament.tieBreak.<type>`) ru aligned to the dictionary («Бухгольц усеченный», «Бухгольц медианный», «Бергер», «Личная встреча», «Число побед», «СЛ Баллы»). en full names unchanged except adding `sl_points`: "SL Points".

## Risks / Trade-offs

- [Abbreviation values differ from the previous hardcoded ones (BHM→MCH, W→WIN)] → intentional alignment with the dictionary; visual-only change, tooltips still carry full localized names.
- [`Record<TieBreakType, number>` and any exhaustive switches break compilation until `sl_points` is handled] → desired: the compiler drives the checklist (model init, computeStandings switch, translation keys both locales).
- [SL Points value can collapse many participants to identical values (e.g. a big trailing group all get 1)] → by design of the coefficient; it is an auxiliary criterion and the chain continues with the next tie-break.
- [Dictionary drift: `schemas/tieBreaks.jsonс` is documentation and can go stale again] → values transcribed once; keeping the mirror in sync is a documentation convention, noted in tasks.

## Migration Plan

None. The new enum member is optional data; no stored documents change. Rollback = remove the type from the enum and the calculator; old documents never contained `sl_points`.