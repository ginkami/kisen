## ADDED Requirements

### Requirement: FESA report export

The crosstable section SHALL show a «FESA» download button (`BsDownload` icon) in its footer when the tournament status is `finished`, and SHALL NOT show it otherwise. Clicking it SHALL download a plain-text file (CRLF line endings, no trailing newline) named `YYYY-MM-DD {parentEvent.locales.en.title} - {locales.en.title}.txt` — YYYY-MM-DD being the last round's date, the parent part omitted when the tournament has no parent event — with the content:
- line 1: `[<parent event en title>: <tournament en title>, <location en settlement>]`; the parent part and the settlement are omitted when absent;
- line 2: the rounds' date range in brackets — `[YYYY-MM-DD]` for a single date, `[YYYY-MM-DD/DD]` within one month, `[YYYY-MM-DD/MM-DD]` within one year, `[YYYY-MM-DD/YYYY-MM-DD]` across years;
- line 3: `[Time control: {mainTime}min + {increment|byoyomiTime|canadianTime}sec]`; the increment part is omitted for absolute time control;
- header line: `Nr Name Nat {round numbers 1..N}` plus `MMSS Pts MMS` when any participant has non-zero starting points, otherwise `Pts`;
- one line per participant, in the crosstable standings order: `Nr [en familyName] [en givenName] {nationality} [{round cells}] [startingPoints] {points without starting points} {points including starting points}` when starting points are active, otherwise `Nr [en familyName] [en givenName] {nationality} [{round cells}] {points}`;
- a round cell is `{opponent report number}{+|-|=}` — the opponent's report number, `0` for a bye or forfeit game — plus `({handicap view})` when the game has a handicap; `+` win, `-` loss, `=` draw.

English locale fields SHALL be used with a `ru` fallback. The report SHALL be built on the fly from the tournament data; no report is downloaded when the tournament is not finished.

#### Scenario: Report with parent event, starting points and handicaps

- **WHEN** a finished tournament with a parent event and non-zero starting points is exported
- **THEN** the report matches the FESA format: bracketed header line with the parent event title, the same-month date range, the time control line, the `MMSS Pts MMS` header, and per-round cells with opponent numbers, result symbols, handicap views, and the `[startingPoints] {points without SP} {points with SP}` columns

#### Scenario: Report without parent event and without starting points

- **WHEN** a finished tournament without a parent event and with zero starting points is exported
- **THEN** the header line contains only the tournament title and settlement, and the rows end with a single `Pts` column

#### Scenario: Date range across months

- **WHEN** the rounds span two months of the same year
- **THEN** the date range line is `[YYYY-MM-DD/MM-DD]`

#### Scenario: Button visibility

- **WHEN** the tournament status is not `finished`
- **THEN** the «FESA» button is not rendered
