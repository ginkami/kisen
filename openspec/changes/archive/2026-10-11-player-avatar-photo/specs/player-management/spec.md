# Spec Delta

## ADDED Requirements

### Requirement: Player avatar field

The `Player` domain model SHALL carry an optional `avatar` field containing the avatar as JPEG bytes (700×700, quality 77). `PlayerService.create`/`update` SHALL accept and persist it, and the Firestore repository SHALL store it as a bytes field, converting between the domain `Uint8Array` and the Firestore bytes representation only at the repository boundary. Binary values SHALL survive the service sanitization pass and the repository timestamp converters unchanged. Players without an avatar SHALL remain valid.

#### Scenario: Player without avatar

- **WHEN** a player document has no `avatar` field
- **THEN** `playerSchema.parse` succeeds and the form state carries `avatar: null`

#### Scenario: Avatar round-trip

- **WHEN** a player with an avatar is saved and later loaded for editing
- **THEN** the loaded `avatar` bytes are identical to the bytes that were saved
- **AND** the sanitized/timestamp-conversion passes did not alter the binary data

### Requirement: Player photo controls in the edit form

The player edit form SHALL render a photo block in place of the photo placeholder: a localized «Фотография» / "Photo" label; a 200×200px preview when an avatar exists; and an add button «Добавить» when no avatar exists, or change «Изменить» and delete «Удалить» buttons when one exists. The add/change button SHALL open a file picker accepting JPEG, PNG, and WebP images and SHALL also accept a matching file dropped (drag-and-drop) onto it. An image whose shortest side is below 700px SHALL be rejected with a localized notification and SHALL NOT open the crop modal. Avatar edits SHALL be form-state changes persisted only when the form is saved; delete SHALL clear the field without a confirmation dialog.

#### Scenario: No avatar yet

- **WHEN** the form state has no avatar
- **THEN** the block shows the label and the «Добавить» button and no preview

#### Scenario: Avatar present

- **WHEN** the form state has an avatar
- **THEN** the block shows the label, a 200×200px preview of the avatar, and the «Изменить» and «Удалить» buttons

#### Scenario: Image below minimum size

- **WHEN** the user picks or drops an image whose shortest side is 699px or less
- **THEN** a localized notification with the image dimensions is shown and the crop modal does not open

#### Scenario: Unsupported file type

- **WHEN** the user picks or drops a file that is not a decodable JPEG, PNG, or WebP image
- **THEN** a localized notification is shown and the crop modal does not open

#### Scenario: Deleting the avatar from the form

- **WHEN** the user presses «Удалить» with an avatar present
- **THEN** the preview disappears and the «Добавить» button reappears
- **AND** the avatar is removed from the player only when the form is saved

### Requirement: Avatar crop modal

Choosing a valid image SHALL open a crop modal showing the image inside a square frame whose display size adapts to the available container. The image SHALL be movable by drag, and SHALL be zoomed with `BsZoomIn` / `BsZoomOut` icon buttons. Zoom-in SHALL be limited so the selected square always covers at least 700px of the source image (no upscaling), and dragging SHALL be clamped so the square stays within the image. The modal SHALL provide «Применить» (apply) and cancel controls; applying SHALL encode the selected square as a 700×700px JPEG with quality 77 via `@jsquash/jpeg` into the form's `avatar` field; cancelling SHALL discard the selection and leave the form unchanged.

#### Scenario: Zoom limit

- **WHEN** the user zooms in until the selected square covers exactly 700px of the source image
- **THEN** further «ZoomIn» presses do not shrink the selection below 700px

#### Scenario: Panning clamped to the image

- **WHEN** the user drags the image far in any direction
- **THEN** the selected square stops at the image borders and never selects an area outside it

#### Scenario: Applying the crop

- **WHEN** the user presses «Применить»
- **THEN** the form's `avatar` field contains a 700×700px JPEG at quality 77 of the selected square
- **AND** the block shows the new avatar in its 200×200px preview after the value updates

#### Scenario: Cancelling the crop

- **WHEN** the user closes the modal without applying
- **THEN** the form's `avatar` field is unchanged
