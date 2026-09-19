# Tasks

## 1. Computation

- [x] 1.1 `crosstableModel.ts`: skip counting (bye/forfeit per participant within `upToRound`), adjusted opponent scores (+0.5 per forfeit, «vs. self»), robot entries (score = own points) in the Buchholz family lists
- [x] 1.2 Robot rounds in BH+/SB (`own points + 0.5` / `0.5 × own points` per skip); BH-BH robot = own points; `points`, DE, W unchanged

## 2. Tests and validation

- [x] 2.1 `crosstableModel.test.ts`: opponent forfeit 0.5; own skip robot entries in BH/BHC/BHM/BH+/SB; updated bye expectations
- [x] 2.2 `tsc -b`, `vitest run`, `openspec validate tie-break-face-value-self` pass
