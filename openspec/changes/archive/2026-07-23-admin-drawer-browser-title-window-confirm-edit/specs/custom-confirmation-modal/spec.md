## ADDED Requirements

### Requirement: Reusable confirmation modal component
The system SHALL provide a `ConfirmModal` component that renders a daisyUI-styled modal with a title, message, confirm button, and cancel button.

#### Scenario: Modal opens when triggered
- **WHEN** `ConfirmModal` receives `isOpen={true}`
- **THEN** the modal is rendered above the page content and blocks interaction with the rest of the page

#### Scenario: Confirm action is invoked
- **WHEN** the user clicks the confirm button
- **THEN** the `onConfirm` callback is called

#### Scenario: Cancel action is invoked
- **WHEN** the user clicks the cancel button or closes the modal
- **THEN** the `onCancel` callback is called

### Requirement: Native confirmation dialogs are replaced
The system SHALL NOT use `window.confirm` for any user-facing confirmation. All existing `window.confirm` calls for publishing, deleting, creating a new tournament with unsaved changes, and navigating away with unsaved changes SHALL use the custom `ConfirmModal`.

#### Scenario: Publish tournament uses custom modal
- **WHEN** the user initiates publishing a tournament
- **THEN** a custom confirmation modal is shown instead of the native browser dialog

#### Scenario: Delete tournament uses custom modal
- **WHEN** the user initiates deleting a tournament
- **THEN** a custom confirmation modal is shown instead of the native browser dialog

#### Scenario: New tournament with unsaved changes uses custom modal
- **WHEN** the user clicks the new tournament button while unsaved changes exist
- **THEN** a custom confirmation modal is shown instead of the native browser dialog

#### Scenario: Navigation with unsaved changes uses custom modal
- **WHEN** the user selects another tournament in the admin drawer while unsaved changes exist
- **THEN** a custom confirmation modal is shown instead of the native browser dialog
