## Purpose

Define the venue-local wall-clock semantics of tournament schedule times: storage of the organizer-entered local datetime (`scheduledAtLocal`), resolution and persistence of the location IANA timezone (`location.timeZone`), derivation of the stored UTC instant from the local time on write, one-time legacy migration on read, and the display fallback when no timezone is available.

## Requirements

### Requirement: Local wall-clock storage for schedule entries

`scheduleEventSchema` and `scheduleRoundSchema` SHALL accept an optional `scheduledAtLocal` object with integer fields `year`, `month` (1-12), `day` (1-31), `hour` (0-23), and `minute` (0-59), representing the wall-clock date and time the organizer entered for the venue location. `scheduledAtLocal` SHALL be the source of truth for the schedule time; the existing `scheduledAt: Date` instant SHALL be derived from it. Documents without `scheduledAtLocal` SHALL continue to parse successfully.

#### Scenario: Schedule entry with local time parses

- **WHEN** a schedule round document contains `scheduledAt` and `scheduledAtLocal: { year: 2026, month: 7, day: 18, hour: 15, minute: 30 }`
- **THEN** the parsed domain object exposes both the instant and the local wall-clock components unchanged

#### Scenario: Legacy entry without local time parses

- **WHEN** a schedule entry document contains only `scheduledAt`
- **THEN** the document parses successfully with `scheduledAtLocal` undefined

### Requirement: Location timezone resolution and persistence

`tournamentLocationSchema` SHALL accept an optional `timeZone` string holding an IANA timezone name. When location coordinates are present and `timeZone` is missing, the save path SHALL resolve the IANA timezone from the coordinates using an offline lat/lng-to-timezone lookup and persist it. The lookup failure SHALL NOT block saving.

#### Scenario: Timezone resolved from coordinates on save

- **WHEN** a tournament with location coordinates (35.6762, 139.6503) and no `timeZone` is saved
- **THEN** the persisted location includes the IANA timezone `Asia/Tokyo`

#### Scenario: Explicit timezone is kept

- **WHEN** a tournament with `location.timeZone = 'Europe/Moscow'` is saved without changing coordinates
- **THEN** the persisted `timeZone` remains `Europe/Moscow`

#### Scenario: Save without coordinates succeeds

- **WHEN** a tournament without location coordinates is saved
- **THEN** the save succeeds and `location.timeZone` stays unset

### Requirement: UTC instant derived from local time on write

On every save and publish, the schedule write path SHALL recompute each entry's `scheduledAt` instant from `scheduledAtLocal` interpreted in the location `timeZone`. When `scheduledAtLocal` is missing or the timezone is unavailable, the existing `scheduledAt` SHALL be preserved as-is. Instant-based consumers (chronological sorting, status computation, `tournamentStart`) SHALL remain unchanged.

#### Scenario: Instant derived from local time

- **WHEN** an entry has `scheduledAtLocal` 2026-07-18 15:30 with location timezone `Asia/Tokyo`
- **THEN** saving persists `scheduledAt` as 2026-07-18 06:30 UTC

#### Scenario: Location change re-derives instants

- **WHEN** a tournament previously in timezone `Europe/Moscow` with local time 15:30 is moved to timezone `Asia/Tokyo` and saved without touching times
- **THEN** the persisted `scheduledAt` instants shift accordingly while the local wall-clock times stay 15:30

#### Scenario: Entry without local time keeps its instant

- **WHEN** an entry has no `scheduledAtLocal` and no timezone is available
- **THEN** saving persists the entry's existing `scheduledAt` unchanged

### Requirement: Legacy schedule migration on read

The tournament repository SHALL, when loading a document whose schedule entries lack `scheduledAtLocal`, backfill `scheduledAtLocal` by interpreting the stored instant's wall clock in the location timezone, and SHALL backfill `location.timeZone` from coordinates when it is missing. The migration SHALL NOT write to Firestore.

#### Scenario: Legacy document gets local components

- **WHEN** a legacy document has `scheduledAt` 2026-07-18 06:30 UTC and location timezone `Asia/Tokyo`
- **THEN** the loaded tournament exposes `scheduledAtLocal` 2026-07-18 15:30 for that entry

#### Scenario: Legacy timezone backfill from coordinates

- **WHEN** a legacy document has coordinates for Tokyo and no `location.timeZone`
- **THEN** the loaded tournament exposes `location.timeZone = 'Asia/Tokyo'`

#### Scenario: Migration is read-only

- **WHEN** a legacy tournament is loaded
- **THEN** no Firestore write is performed by the migration

### Requirement: Fallback when timezone is unavailable

When no IANA timezone can be determined for a tournament (no coordinates and no stored `timeZone`), schedule datetimes SHALL be displayed with the pre-existing behavior, and no venue-local-time hint SHALL be shown. Instants SHALL never be reinterpreted as local wall-clock times in this case.

#### Scenario: Tournament without timezone

- **WHEN** a tournament has no location timezone and schedule entries without `scheduledAtLocal`
- **THEN** the UI renders datetimes as before the change and shows no venue-local-time tooltip
