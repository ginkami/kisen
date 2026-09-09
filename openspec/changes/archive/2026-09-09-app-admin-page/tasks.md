## 1. Admin drawer entry button

- [x] 1.1 Add the admin-only «Управление приложением» button (`BsSliders` icon, `handleNavigate('/app-admin')`) as the first item of the drawer panel above the accordion in `src/components/AdminDrawer.tsx`

## 2. Application administration page

- [x] 2.1 Create `src/pages/AppAdminPage.tsx` and register the `/app-admin` route in `src/App.tsx`
- [x] 2.2 Create `src/components/appAdmin/AppAdminPanel.tsx`: admin-only guard with localized access alert, page title, daisyUI `tabs tabs-lift` radio panel with a single «Настройки» tab and an empty section (placeholder)

## 3. i18n

- [x] 3.1 Add `admin.manageApp` and `appAdmin.*` keys to `src/locales/ru/translation.json` and `src/locales/en/translation.json`

## 4. Tests

- [x] 4.1 Add `src/test/appAdminPage.test.tsx`: admin sees title + settings tab + placeholder; non-admin sees the access alert
- [x] 4.2 Add `src/test/adminDrawerManageAppButton.test.tsx`: button visible for admin, hidden for manager, click navigates to `/app-admin`

## 5. Validation

- [x] 5.1 `npx tsc -b` passes
- [x] 5.2 `npx vitest run` all green (612 passed, was 606 baseline + 6 new)
- [x] 5.3 `npx vite build` succeeds
- [x] 5.4 `openspec validate app-admin-page` passes

