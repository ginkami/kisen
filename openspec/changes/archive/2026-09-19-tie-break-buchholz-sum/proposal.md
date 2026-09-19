## Why

Shogi federations use the «Sum of Buchholz» coefficient (BH-BH / СБ): the sum of the Buchholz values of the opponents a participant has faced. It rewards participants who faced stronger-by-strength-of-schedule fields and complements the existing Buchholz family.

## What Changes

- New tie-break type `buchholz_sum` («Бухгольц суммарный», en: "Sum of Buchholz", abbr: BH-BH / СБ) in the tie-break domain schema — a unique, parameterless tie-break like `buchholz`.
- Crosstable standings compute BH-BH as the sum of each faced opponent's Buchholz value (two-pass, like direct encounter); byes contribute no opponent and forfeit games are excluded, consistent with the other Buchholz variants.
- New tournament drafts default to `points → buchholz → sonneborn_berger → buchholz_sum` (BH-BH is the fourth, added after Sonneborn-Berger).
- i18n ru/en labels and abbreviations: «Бухгольц суммарный» / «СБ», "Sum of Buchholz" / "BH-BH".

## Capabilities

### Modified Capabilities
- `tournament-crosstable`: the tie-break computation requirement gains the `BH-BH` calculator definition and a scenario.
- `tournament-edit-form-ux`: the draft defaults requirement now initializes four tie-breaks with `buchholz_sum` fourth.

## Impact

- **Affected specs:** `openspec/specs/tournament-crosstable/spec.md`, `openspec/specs/tournament-edit-form-ux/spec.md`.
- **Affected code:** `src/domain/tieBreak.ts`, `src/components/tournament/crosstable/crosstableModel.ts`, `src/services/tournamentService.ts` (`defaultSettings`), `src/locales/{ru,en}/translation.json`, tests (`crosstableModel.test.ts`, `tournamentService.test.ts`).
