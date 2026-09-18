## ADDED Requirements

### Requirement: Promotion entity with admin-only CRUD

The platform SHALL support a `promotion` entity (Firestore collection `promotions`, one document per promotion) with the fields `id` (auto-generated UUID), `tournament` (required FK to the tournament), `showOnHome` (boolean, default false), `startedAt` (Date) and `endedAt` (Date). Firestore rules SHALL allow public reads and SHALL restrict create, update and delete to users with the `admin` role. A tournament MAY have several promotions. The promotion service SHALL expose: listing the promotions of a tournament, listing all promotions, creating a promotion for a tournament with defaults (`showOnHome: false`, `startedAt: now`, `endedAt: now + 7 days`), updating a promotion by id, and deleting a promotion by id.

#### Scenario: Admin creates a promotion

- **WHEN** an admin clicks «Промоактивность» for a tournament
- **THEN** a new promotion document is created with default values and appears as an editable card

#### Scenario: Non-admin cannot modify promotions

- **WHEN** a user without the `admin` role attempts to create, update or delete a promotion
- **THEN** the operation is denied by the Firestore rules

### Requirement: Promotion management section in the tournament settings

The tournament edit form's «Settings» tab SHALL contain a «Продвижение» (en: «Promotion») section rendered only for users with the `admin` role. The section SHALL show a «Промоактивность» (en: «Promotional activity») add button (`BsPlus`) and a card per promotion of the tournament with:
- a status badge derived from `startedAt`/`endedAt` relative to the current time: «не началась», «проходит» or «завершена»;
- a daisyUI toggle «Показывать на главной странице» bound to `showOnHome`;
- a «Действует» group with two datetime inputs «с» and «по» bound to `startedAt` and `endedAt`, validated so that «с» is earlier than «по» (invalid input disables saving);
- a «Сохранить» button disabled while the card matches the stored promotion;
- a «Удалить» button opening a confirmation modal before deletion.

#### Scenario: Status badge reflects the promotion window

- **WHEN** a promotion's window has not started / is running / has ended
- **THEN** the card shows the badge «не началась» / «проходит» / «завершена» respectively

#### Scenario: Invalid window blocks saving

- **WHEN** the «с» input is not earlier than the «по» input
- **THEN** a validation message is shown and «Сохранить» is disabled

#### Scenario: Section is admin-only

- **WHEN** a non-admin user opens the Settings tab
- **THEN** the «Продвижение» section is not rendered

### Requirement: Cascade deletion of promotions with the tournament

When a tournament is deleted, the system SHALL delete every promotion document whose `tournament` field references the deleted tournament. The cascade SHALL run after the tournament document is removed and SHALL NOT fail the tournament deletion if the promotion cleanup fails (a warning is logged; orphaned promotion documents may remain until cleanup). The promotion service SHALL expose deleting all promotions of a tournament in a single Firestore batch.

#### Scenario: Tournament deletion removes its promotions

- **WHEN** a tournament with one or more promotions is deleted
- **THEN** all promotion documents referencing the deleted tournament are removed from the `promotions` collection

#### Scenario: Tournament without promotions

- **WHEN** a tournament without any promotions is deleted
- **THEN** no promotion documents are touched

#### Scenario: Cascade failure does not break tournament deletion

- **WHEN** the promotion cascade fails during a tournament deletion
- **THEN** the tournament deletion still succeeds and a warning is logged

### Requirement: Promoted tournaments on the home page

The home page SHALL render tournament cards (the same card as the tournament sections) under the page heading, above the status tablist, for promotions with `showOnHome == true` whose `startedAt`/`endedAt` window covers the current time. The cards SHALL be ordered: active promotions on top (by `startedAt` descending), then upcoming promotions with the nearest `startedAt` first, then finished promotions at the bottom (by `endedAt` descending). When no promotion qualifies, the block SHALL not be rendered.

#### Scenario: Active promotion shows the tournament card

- **WHEN** a promotion with `showOnHome == true` has a window covering the current time
- **THEN** the promoted tournament's card is rendered above the status tablist among the top (active) promotions

#### Scenario: Sorting of promoted cards

- **WHEN** promoted promotions include active, upcoming and finished windows
- **THEN** active cards are rendered on top, upcoming follow with the nearest first, and finished cards are rendered last

#### Scenario: No qualifying promotions

- **WHEN** no promotion with `showOnHome == true` covers the current time
- **THEN** the promoted block is not rendered
