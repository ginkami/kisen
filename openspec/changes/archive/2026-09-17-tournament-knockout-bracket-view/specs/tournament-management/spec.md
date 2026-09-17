## ADDED Requirements

### Requirement: Knockout bracket settings in Advanced Settings

The tournament settings SHALL carry `hasKnockoutBracket: { size: Int, startRound: Int }` with both values defaulting to 0 (no bracket) so legacy documents parse unchanged. The tournament edit form's «Advanced Settings» section SHALL contain a daisyUI collapse «Показывать сетку плей-офф, если есть» (en: «Show knockout bracket, if any») with two range sliders:
- «Размер сетки» (en: «Bracket size») over the stops 0 (default), 4, 8, 16, 32, 64, 128, 256, 512, 1024, with the current value displayed;
- «Стартует с тура» (en: «Starts at round») over 0 (default) … 10, with the current value displayed.

Changing a slider SHALL update `settings.hasKnockoutBracket` of the edited tournament. When the size is greater than 0 and the start round is 0, a hint SHALL suggest setting the start round.

#### Scenario: Legacy tournament parses with defaults

- **WHEN** a stored tournament document has no `hasKnockoutBracket` in its settings
- **THEN** the parsed tournament settings carry `hasKnockoutBracket: { size: 0, startRound: 0 }`

#### Scenario: Host configures the bracket

- **WHEN** the host opens the collapse and moves the size slider to 8 and the start-round slider to 3
- **THEN** the edited tournament settings carry `hasKnockoutBracket: { size: 8, startRound: 3 }`

### Requirement: Knockout bracket tab on the tournament page

The public tournament page SHALL show a «Сетка плей-офф» (en: «Knockout bracket», `BsDiagram2Fill`) tab when `settings.hasKnockoutBracket.size > 0`, and SHALL NOT show it otherwise. The tab renders the visual bracket for the stored bracket size and start round: knockout-round columns laid out left to right, participant cards with the locale-dependent «фамилия, имя», connector lines toward the next round with winning lines highlighted and the winner's surname in small text above the connector, bye cards, dashed TBD placeholders for slots whose winner is not yet known, and an emphasized champion card for the final. The bracket is reconstructed from the published games on the fly per the `knockout-engine` capability; when the reconstruction fails, the tab SHALL show an informational empty state instead of the bracket.

#### Scenario: Tab appears for a configured bracket

- **WHEN** a public tournament has `hasKnockoutBracket.size = 8`
- **THEN** the page shows the «Сетка плей-офф» tab

#### Scenario: Bracket renders with winners and placeholders

- **WHEN** the knockout rounds played so far determine some winners
- **THEN** the bracket shows those winners with highlighted lines, and not-yet-determined slots as dashed TBD placeholders down to the final

#### Scenario: Bracket cannot be reconstructed

- **WHEN** the played rounds do not form a canonical bracket for the stored size and start round
- **THEN** the tab shows an informational empty state and no bracket
