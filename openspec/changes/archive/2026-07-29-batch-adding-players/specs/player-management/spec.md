## ADDED Requirements

### Requirement: Player CSV bulk import

`PlayerService` SHALL provide an `importFromCsv(file: File, createdBy: string)` method that parses a `;`-delimited CSV file, validates each row, deduplicates against existing players, and creates or updates players. The method SHALL return an `ImportResult` object with `added`, `updated`, `invalid` counts and an `errors` array describing why each invalid row was rejected.

#### Scenario: Importing valid CSV with new players

- **WHEN** `importFromCsv` is called with a valid CSV file containing 3 new players
- **THEN** all 3 players are created via `repository.create`
- **AND** `ImportResult.added` is 3, `updated` is 0, `invalid` is 0

#### Scenario: Importing CSV with existing players

- **WHEN** a CSV row has familyName + givenName that exactly match an existing player in any locale
- **THEN** the existing player is updated via `repository.update`
- **AND** `ImportResult.updated` increments

#### Scenario: Importing CSV with invalid rows

- **WHEN** a CSV row has no locale with both familyName and givenName filled
- **THEN** the row is counted as invalid
- **AND** the reason is recorded in `ImportResult.errors`

#### Scenario: Importing CSV with invalid nationality

- **WHEN** a CSV row has a nationality field that is not exactly 2 characters
- **THEN** the row is counted as invalid

#### Scenario: Importing CSV with invalid rank format

- **WHEN** a CSV row has a rank field that does not match `N Dan` (N=1-9) or `N Kyu` (N=1-20)
- **THEN** the row is counted as invalid

#### Scenario: Rank conversion

- **WHEN** a CSV row has rank `"5 Dan"`
- **THEN** the player's `currentRating.rank` is set to `"5d"`
- **WHEN** a CSV row has rank `"3 Kyu"`
- **THEN** the player's `currentRating.rank` is set to `"3k"`

#### Scenario: Deduplication logic

- **WHEN** processing a CSV row
- **THEN** the system loads all existing players via `listAll`
- **AND** builds an index by (familyName, givenName) per locale
- **AND** if any locale of the CSV row matches an existing player, that player is updated
- **AND** if no match is found, a new player is created

### Requirement: Player repository listAll method

`PlayerRepository` SHALL expose a `listAll(): Promise<Player[]>` method that returns all players. The Firestore implementation SHALL query the entire `players` collection.

#### Scenario: Fetching all players for deduplication

- **WHEN** `listAll` is called
- **THEN** all player documents are returned from Firestore

### Requirement: Bulk import button in admin panel

The AdminDrawer Players section SHALL display a bulk-import button (visible only to users with role `admin`) containing the icons `BsPeople`, `BsFiletypeCsv`, `BsPlus`. The button SHALL support both file-picker selection and drag-and-drop of `.csv` files. During processing, the button content SHALL be replaced with a loading spinner. Results SHALL be shown in a `BulkImportResultModal`.

#### Scenario: Admin views bulk import button

- **WHEN** a user with role `admin` opens the Players section
- **THEN** a bulk import button with three icons is visible

#### Scenario: Non-admin cannot see bulk import button

- **WHEN** a user with role `manager` or `user` opens the Players section
- **THEN** the bulk import button is not displayed

#### Scenario: Selecting a CSV file

- **WHEN** the admin clicks the bulk import button and selects a `.csv` file
- **THEN** the file is processed via `importFromCsv`
- **AND** the button shows a loading spinner during processing

#### Scenario: Dragging a CSV file onto the button

- **WHEN** the admin drags a `.csv` file onto the bulk import button and releases
- **THEN** the file is processed via `importFromCsv`

#### Scenario: Showing import results

- **WHEN** the import completes
- **THEN** a `BulkImportResultModal` is displayed
- **AND** it shows counts of added, updated, and invalid rows
- **AND** it lists reasons for each invalid row

#### Scenario: Import error handling

- **WHEN** the import fails due to an unreadable file, network error, or Firestore error
- **THEN** the modal displays an error message describing the failure