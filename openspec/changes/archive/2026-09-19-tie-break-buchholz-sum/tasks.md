# Tasks

## 1. Domain and computation

- [x] 1.1 `src/domain/tieBreak.ts`: `buchholz_sum` in `tieBreakTypeSchema` and the discriminated union (parameterless, unique)
- [x] 1.2 `crosstableModel.ts`: `calcBuchholzSum` (sum of faced opponents' BH; bye — no opponent; forfeit games excluded), two-pass precompute of participants' BH, `buchholz_sum` key in `tieBreakValues`, switch case

## 2. Defaults and i18n

- [x] 2.1 `tournamentService.defaultSettings`: `points → buchholz → sonneborn_berger → buchholz_sum`
- [x] 2.2 i18n ru/en: `tournament.tieBreak.buchholz_sum` = «Бухгольц суммарный» / "Sum of Buchholz"; `abbr.buchholz_sum` = «СБ» / "BH-BH"

## 3. Tests and validation

- [x] 3.1 `crosstableModel.test.ts`: BH-BH equals the sum of faced opponents' BH, sorting by BH-BH, bye contributes nothing
- [x] 3.2 `tournamentService.test.ts`: createDraft defaults are four entries with `buchholz_sum` fourth
- [x] 3.3 `tsc -b`, `vitest run`, `openspec validate tie-break-buchholz-sum` pass
