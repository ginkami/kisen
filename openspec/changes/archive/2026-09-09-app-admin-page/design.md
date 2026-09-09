# app-admin-page — Design

## Context

The admin drawer (`src/components/AdminDrawer.tsx`) opens with a sticky header and a `<div className="px-4 pb-4">` block that currently starts directly with the DaisyUI radio accordion (`name="admin-accordion"`). Navigation to edit pages goes through `handleNavigate`, which honors the global unsaved-changes guard. `UserEditForm` established the client-side role-guard pattern (`user?.role === 'admin'` from `useAuth()` with a localized warning alert). The project has no daisyUI tab usage yet; the accordion already uses the radio-input pattern.

## Goals / Non-Goals

- Goals: admin-only entry button (first item of the drawer panel) and a skeleton administration page with a tab panel holding one empty «Настройки» tab.
- Non-Goals: actual settings storage, management commands, server-side rules for settings (nothing to protect yet), granting the admin role.

## Decisions

### Decision 1: Entry as a button above the accordion, rendered only for admins
The button is placed inside the drawer panel before the accordion so it reads as the first item. It reuses `handleNavigate('/app-admin')` so the unsaved-changes guard applies. Visibility is gated by the already-computed `isAdmin`.

*Alternative considered:* an accordion section — rejected: it is a navigation entry, not a content section; the accordion stays dedicated to management lists.

### Decision 2: Radio-based daisyUI `tabs tabs-lift` without React state
The tab panel uses daisyUI's radio tab pattern (`<input type="radio" name="app-admin-tabs" role="tab">` + sibling `tab-content` blocks). This is CSS-only, mirrors the accordion's radio approach, and keeps the skeleton trivial; each future tab is one more `input` + `tab-content` pair. Switching to state-driven tabs remains possible later if a tab needs dynamic behavior.

### Decision 3: Client-side admin guard, page-level
`AppAdminPanel` renders the localized access alert when the signed-in user's role is not `admin`, following `UserEditForm`. There is nothing server-protected yet, so no Firestore rules changes; when real settings appear, their rules will enforce authorization server-side.

### Decision 4: Route `/app-admin`
Top-level route consistent with existing naming (`/profile`, `/users/:id/edit`) — no `/admin` prefix exists in the project.

## Risks / Trade-offs

- **[Empty section placeholder]** A completely empty `tab-content` can look broken; a neutral localized placeholder line marks it as intentionally empty until settings arrive.
- **[Radio tabs are not keyboard-focus-visible per tab]** Acceptable for a single static tab; revisit if accessibility issues surface when real tabs land.

## Migration Plan

Pure additive UI change; no data, rules, or index migrations.
