## MODIFIED Requirements

### Requirement: Managed associations shortcuts

The profile page SHALL render an «Ассоциации, которыми управляете» section listing associations the user created (badged with «(создатель)») or is listed in `managers`, as badges linking to `/assn/:id/edit`. For each listed association where the user is a manager but not the creator, the badge SHALL include a «×» button that opens an error-variant confirmation modal warning the user they will be removed from the association's management and can only return via a new invite. Confirming the modal SHALL remove the user from that association's `managers` array and refresh the managed-associations list; cancelling SHALL keep the membership. A failed removal SHALL show a localized error alert and keep the badge. Badges for associations the user created SHALL NOT include the «×» button. When there are no managed associations, the section SHALL show a localized empty hint.

#### Scenario: Creator badge

- **WHEN** the user created an association
- **THEN** its badge shows the localized association title with the «(создатель)» mark and links to `/assn/{id}/edit`
- **AND** the badge has no remove button

#### Scenario: Manager badge

- **WHEN** the user is a manager (not creator) of an association
- **THEN** its badge shows the title without the creator mark, links to `/assn/{id}/edit`, and includes a «×» remove button

#### Scenario: Remove button opens the confirmation modal

- **WHEN** the user clicks the «×» button on a manager badge
- **THEN** an error-variant confirmation modal is displayed warning that the user will be removed from the association's management and can only return via a new invite

#### Scenario: Confirming removal leaves the association management

- **WHEN** the user confirms the removal modal
- **THEN** the user's id is removed from that association's `managers` array
- **AND** the managed-associations list is refreshed and the badge disappears

#### Scenario: Cancelling removal keeps membership

- **WHEN** the user cancels the removal modal
- **THEN** the user stays in the association's `managers` array
- **AND** no update request is sent

#### Scenario: Failed removal shows an error

- **WHEN** the removal request fails
- **THEN** a localized error alert is displayed
- **AND** the badge remains in the list

#### Scenario: No managed associations

- **WHEN** `useMyAssociations` returns an empty list
- **THEN** the section shows a localized "no associations" hint
