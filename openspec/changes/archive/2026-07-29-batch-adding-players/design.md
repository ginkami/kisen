## Context

The admin panel has a Players section with manual add + search. CSV import will batch-process player data exported from external systems (e.g. rating lists). The CSV format uses `;` as delimiter with columns: `en.familyName;en.givenName;ru.familyName;ru.givenName;rank;rating;nationality;residence;en.location;ru.location`.

## Goals / Non-Goals

**Goals:**
- Parse `;`-delimited CSV files with the documented column layout.
- Validate each row: at least one locale with non-empty familyName + givenName, valid nationality (2-letter), valid rank format if present.
- Deduplicate: exact match on (familyName, givenName) in any locale → update; otherwise create.
- Show results in a modal: added / updated / invalid counts + error reasons.
- Support drag-and-drop and file picker on the import button.

**Non-Goals:**
- CSV export (separate feature).
- Real-time progress bar (spinner is sufficient for MVP).
- Transactional rollback (partial success is acceptable; each row is independent).
- XLSX parsing (CSV only).

## Decisions

### Decision 1: CSV parsing without external dependency

**Choice:** Simple `split(';')` per line. No PapaParse or similar.

**Rationale:** The CSV format is simple (no quoted fields, no embedded delimiters in the expected data). Adding a parser dependency is overkill.

### Decision 2: Rank conversion

**Choice:** Convert CSV rank strings (`"5 Dan"`, `"3 Kyu"`) to domain format (`"5d"`, `"3k"`) via regex `^(\d+)\s*(Dan|Kyu)$`.

### Decision 3: Dedup via `listAll`

**Choice:** Fetch all players once via `listAll()`, build an in-memory index by `(familyName, givenName)` per locale, then match each CSV row.

**Rationale:** Firestore has no composite index for arbitrary locale name pairs. Loading all players once is simpler than per-row queries and acceptable for the expected dataset size (hundreds, not millions).

### Decision 4: Validation rules

**Required (row is invalid if missing):**
- At least one locale with non-empty `familyName` AND `givenName`
- `nationality` — non-empty, 2 characters

**Optional (validated only if present):**
- `rank` — must match `N Dan` (N=1-9) or `N Kyu` (N=1-20)
- `rating` — must be a number
- `residence` — must be 2 characters if non-empty
- `en.location`, `ru.location` — any string

### Decision 5: Button visible only for admin role

**Choice:** `user?.role === 'admin'` gate. Managers can still use manual add but not bulk import.

## Risks / Trade-offs

- **[Risk] Large files slow down `listAll`** → Acceptable for MVP; can add pagination/limit later.
- **[Risk] Concurrent imports could create duplicates** → Acceptable; admin is a single user operating.
- **[Trade-off] No rollback** → Each row is independent; partial success is reported in the results modal.