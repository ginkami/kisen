## Purpose

The regulation entity stores reusable, localized Markdown texts (tournament rules, provisions, regulations) that can be affiliated with an association and referenced from tournaments.

## Requirements

### Requirement: Regulation entity and schema

The system SHALL support a `regulation` domain entity stored in the Firestore collection `regulations` with the following fields: `id` (UUIDv7, primary key), `createdBy` (required, user id), `association` (required, UUIDv7 or null — the association applying this regulation), `updatedAt` (required, Date), and `locales` (required, at least one locale with a non-empty `title` and an optional Markdown `description`). A regulation SHALL NOT have a slug or public URL in this change. Dates SHALL be converted to/from Firestore Timestamps only inside the repository implementation.

#### Scenario: Regulation document shape

- **WHEN** a regulation is created
- **THEN** the stored document contains `id`, `createdBy`, `association` (null when no association is affiliated), `updatedAt`, and `locales` with at least one locale holding a non-empty `title`

#### Scenario: Localization fallback

- **WHEN** a regulation is rendered and has no value for the current UI locale
- **THEN** the value from another existing locale is used

### Requirement: Regulation access control

Firestore security rules SHALL enforce the following access matrix for `regulations`:

- **read:** public (any client, authenticated or not).
- **create:** any authenticated user; when the new regulation has a non-null `association`, the user SHALL be a manager or creator of that association, or an admin.
- **update:** admins, the creator (`createdBy`), and managers or creators of the affiliated `association`. Changing `association` to a different association additionally requires manager or creator rights on the new association (or admin).
- **delete:** only the creator (`createdBy`) or an admin — managers of the affiliated association SHALL NOT be allowed to delete.

#### Scenario: Creator can edit and delete their regulation

- **WHEN** the user who created a regulation (with any `association` value) attempts to update or delete it
- **THEN** both operations are allowed

#### Scenario: Association manager or creator can edit but not delete

- **WHEN** a manager or creator of the association affiliated with a regulation (who is not the creator of the regulation and not an admin) attempts to update it
- **THEN** the update is allowed
- **AND** when the same user attempts to delete it, the operation is denied

#### Scenario: Admin can do everything

- **WHEN** an admin attempts to create, update, or delete any regulation
- **THEN** all operations are allowed

#### Scenario: Creating a regulation affiliated with an association requires manager or creator rights

- **WHEN** an authenticated user who is neither a manager nor the creator of association A attempts to create a regulation with `association = A`
- **THEN** the create is denied

#### Scenario: Changing the affiliated association requires manager or creator rights on the new association

- **WHEN** a user updates a regulation and changes `association` from A to B
- **THEN** the update is allowed only if the user is a manager or creator of B (or an admin)

### Requirement: Regulation service and repository

The service layer SHALL expose `getById`, `create`, `update`, `delete`, and `listEditable(userId, managedAssociationIds, isAdmin)` for regulations. The repository SHALL support `list` with `createdBy` and `association` filters, ordered by `updatedAt` descending. `listEditable` SHALL return, for an admin, all regulations; for any other user, the union of regulations created by the user and regulations affiliated with associations the user manages — deduplicated by id and sorted by `updatedAt` descending. `create` SHALL generate the `id` (UUIDv7), set `updatedAt` to the current time, and normalize an empty association to `null`; `update` SHALL refresh `updatedAt`.

#### Scenario: listEditable merges created and affiliated regulations

- **WHEN** a user created 2 regulations and manages an association affiliated with 3 regulations (one of which the user also created)
- **THEN** `listEditable` returns 4 unique regulations sorted by `updatedAt` descending

#### Scenario: Admin sees all regulations

- **WHEN** an admin calls `listEditable`
- **THEN** all regulations in the collection are returned

### Requirement: Regulation edit page

The app SHALL provide routes `/regulations/new` and `/regulations/:id/edit` rendering a `RegulationEditForm` with the same UX as the event edit form, except there is no slug field. The form SHALL contain: a header with the management-panel overline, localized title (or «Новый регламент» / "New regulation" for a new one), document title update, and Save/Delete buttons; a «Основная информация» card with `LocaleTabs`, a required localized title input, and a Markdown-capable description via `ExpandableField`; a «Дополнительно» card with the association picker (`AssociationPickerModal`). The Delete button SHALL be visible only when the current user is the creator of the regulation or an admin; deletion SHALL require confirmation. Validation SHALL require a non-empty title in at least one locale. Unsaved-changes navigation protection SHALL work as on other edit pages.

#### Scenario: Creating a new regulation

- **WHEN** the user navigates to `/regulations/new`, fills a title in one locale, and saves
- **THEN** a regulation is created and the browser navigates to `/regulations/:id/edit`

#### Scenario: Deleting is offered only to the creator or admin

- **WHEN** a manager of the affiliated association (not the creator, not an admin) opens the regulation edit page
- **THEN** no Delete button is rendered while Save remains available

#### Scenario: Title validation

- **WHEN** the user saves a regulation with empty titles in all locales
- **THEN** validation fails with a required-field error and nothing is saved

### Requirement: Admin drawer regulations section

The admin drawer SHALL contain a «Регламенты» / "Regulations" accordion section available to every authenticated user. The section SHALL contain only: a create button («+ Регламент» / "+ Regulation" with the `BsPlus` icon) navigating to `/regulations/new`, and a scrollable list of regulations returned by `listEditable` for the current user — each item showing the localized title and navigating to `/regulations/:id/edit` on click. The section SHALL NOT provide a month selector or a text search. An empty-state hint SHALL be shown when the list is empty.

#### Scenario: User opens the regulations section

- **WHEN** an authenticated user expands the «Регламенты» drawer section
- **THEN** a create button and the scrollable list of regulations editable by the user are rendered

#### Scenario: Empty list

- **WHEN** the user has no editable regulations
- **THEN** the section shows an empty-state hint

#### Scenario: Navigating to a regulation

- **WHEN** the user clicks a regulation item in the list
- **THEN** the app navigates to `/regulations/:id/edit`