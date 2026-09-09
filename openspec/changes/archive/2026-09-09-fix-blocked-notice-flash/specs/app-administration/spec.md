## MODIFIED Requirements

### Requirement: Application administration page access

The page at `/app-admin` SHALL be accessible only to users with the `admin` role. While authentication and the user profile are loading, the page SHALL render a loading spinner instead of an access verdict. Non-admins SHALL see a localized access-restricted alert instead of the page content once loading has finished.

#### Scenario: Admin opens the page

- **WHEN** an admin opens `/app-admin`
- **THEN** the page content is rendered

#### Scenario: Non-admin opens the page

- **WHEN** a user with role `manager` or `user` opens `/app-admin`
- **THEN** a localized access-restricted alert is shown instead of the content

#### Scenario: Loading state does not flash the access alert

- **WHEN** the page is opened while authentication or the profile is still loading
- **THEN** a loading spinner is shown instead of the access-restricted alert
