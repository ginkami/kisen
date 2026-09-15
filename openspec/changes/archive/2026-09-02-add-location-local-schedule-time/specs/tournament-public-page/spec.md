## MODIFIED Requirements

### Requirement: Tournament meta lines

The page SHALL render, directly under the tournament title, one line per characteristic, each with a leading icon: (1) `BsCalendar3` + the tournament dates in compact range format; (2) country flag + full country name in the current locale + localized settlement; (3) `BsGeoAlt` + localized venue — rendered only when the venue is non-empty; (4) `FaUsers` + number of participants; (5) `BsHourglassSplit` + short time control; (6) `BsPlayFill` + round count; (7) `PiGavelLight` + arbiter name as «familyName, givenName». The dates SHALL be computed from the unique calendar days of `schedule.rounds[].scheduledAt` and `schedule.events[].scheduledAt` taken in the location IANA timezone when it is known (fallback: the previous UTC-based day computation) and the fallback day of `updatedAt` otherwise, and formatted as: single day «10 августа 2026»; consecutive days joined by an en dash «10–11 августа 2026»; days with gaps listed comma-separated «10, 12, 25 августа 2026», with a month name repeated whenever the month changes «10, 12 августа, 3 сентября 2026», including cross-month ranges «25 августа – 5 сентября 2026»; the year SHALL appear once at the end.

#### Scenario: Single-day tournament

- **WHEN** all schedule dates fall on the same calendar day
- **THEN** the dates line shows that single day with month and year (e.g. «10 августа 2026»)

#### Scenario: Consecutive days

- **WHEN** the schedule days are August 10 and August 11 of the same year
- **THEN** the dates line shows «10–11 августа 2026»

#### Scenario: Days with gaps across months

- **WHEN** the schedule days are August 10, August 12, and September 3 of the same year
- **THEN** the dates line shows «10, 12 августа, 3 сентября 2026»

#### Scenario: Continuous range across months

- **WHEN** every day from August 25 to September 5 is covered by schedule entries
- **THEN** the dates line shows «25 августа – 5 сентября 2026»

#### Scenario: Days grouped in the venue timezone

- **WHEN** the location timezone is `Asia/Tokyo` and the only schedule instant falls on July 18 15:30 Tokyo time (July 18 06:30 UTC)
- **THEN** the dates line shows «18 июля 2026», not a UTC-derived day

#### Scenario: Location line

- **WHEN** the tournament location has country `BY` and settlement «Минск» while the UI locale is `ru`
- **THEN** the location line shows the Belarus flag, «Беларусь», and «Минск»

#### Scenario: Venue line is conditional

- **WHEN** `location.locales.<lang>.venue` is empty or undefined
- **THEN** no venue line is rendered

#### Scenario: Time control short format

- **WHEN** the time control is byoyomi with 40 main minutes, 30 byoyomi seconds, and 3 periods
- **THEN** the time control line shows «40 минут + 30 секунд × 3 (Бёёми)» in the `ru` locale

#### Scenario: No schedule dates

- **WHEN** the tournament has no rounds and no events scheduled
- **THEN** the dates line falls back to the day of `updatedAt`

### Requirement: Schedule list section

The «Расписание» section SHALL render a read-only list of schedule rows (rounds and events merged), sorted chronologically by `scheduledAt`. When the location IANA timezone is known, each row SHALL show a datetime block in the venue timezone: the local time «hh:mm» prominently, followed by an `BsInfoCircleFill` info icon with a tooltip explaining that the time is the venue's local time (localized, e.g. «По локальному времени места проведения»); beneath, in smaller text, the abbreviated weekday and date «вт, 18.07.2026» (localized weekday, e.g. «Tue» in `en`), and the UTC time «12:30 UTC» extended with the UTC date «19.07» when the UTC calendar day differs from the local day. When the timezone is unknown, each row SHALL show the date and time as before the change without the info icon. Each row SHALL also show a «Тур {n}» badge for round rows, or the localized event title for event rows. No inputs, buttons, or other editable controls SHALL be present.

#### Scenario: Mixed rounds and events

- **WHEN** the schedule contains a round on August 10 at 12:00 and an event «Открытие» on August 10 at 10:00
- **THEN** the list shows the «Открытие» row first, followed by the «Тур 1» row, each with the formatted date and time

#### Scenario: Venue-local time with matching UTC day

- **WHEN** the location timezone is `Europe/Moscow` and a round is scheduled at 2026-07-18 15:30 local (12:30 UTC, same calendar day)
- **THEN** the row shows prominently «15:30» with the info icon, and below «сб, 18.07.2026» and «12:30 UTC»

#### Scenario: UTC day differs from local day

- **WHEN** the location timezone is `Asia/Tokyo` and a round is scheduled at 2026-07-18 15:30 local (2026-07-18 06:30 UTC)
- **THEN** the UTC part shows «06:30 UTC» without an extra date because the UTC day matches

#### Scenario: UTC day shifts to the next day

- **WHEN** the location timezone is `Europe/Moscow` and a round is scheduled at 2026-07-18 02:30 local (2026-07-17 23:30 UTC)
- **THEN** the UTC part shows «23:30 UTC 17.07» with the inserted UTC date

#### Scenario: Localized weekday

- **WHEN** the UI locale is `en` and the schedule day is Tuesday, July 18, 2026
- **THEN** the smaller date line shows «Tue, 18.07.2026»

#### Scenario: Unknown timezone falls back

- **WHEN** the tournament has no location timezone
- **THEN** rows render the date and time as before the change and show no info icon
