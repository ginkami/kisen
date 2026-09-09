## Why

Site administration currently has no dedicated surface: role changes and user management live in the admin drawer, but there is no place for application-level settings and management commands. As a foundation, the admin panel needs an entry point and a skeleton page that will host setting sections and management commands as tabs.

## What Changes

- Add an admin-only «Управление приложением» button as the first item of the admin drawer panel (above the accordion), navigating to `/app-admin` via the existing unsaved-changes guard.
- New `/app-admin` route with `AppAdminPage`: accessible only to users with role `admin`; non-admins see a localized access alert.
- Page title «Управление приложением» and a daisyUI `tabs tabs-lift` tab panel (radio-based, CSS-only) with a single «Настройки» tab whose section is empty for now (neutral placeholder text).
- i18n keys `admin.manageApp` and `appAdmin.*` (ru/en).

## Capabilities

### New Capabilities

- `app-administration`: the admin drawer entry button and the skeleton application administration page (admin-only guard, title, tab panel with an empty Settings tab).

## Impact

- `src/components/AdminDrawer.tsx` (button), `src/pages/AppAdminPage.tsx` (new), `src/components/appAdmin/AppAdminPanel.tsx` (new), `src/App.tsx` (route), `src/locales/ru/translation.json` + `src/locales/en/translation.json`.
- No service, Firestore rules, or index changes — the Settings section is empty; future changes will add settings storage and rules.
- Out of scope: actual application settings, management commands, granting the admin role (custom claim).
