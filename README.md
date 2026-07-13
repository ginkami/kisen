# shogi·world

[![Русская версия](https://img.shields.io/badge/Русский-README.ru.md-blue)](./README.ru.md)

A single-page application for creating, managing, and publishing shogi (Japanese chess) tournaments. Built as an MVP with a clean architecture that keeps the Firebase layer isolated, making future migration to a custom backend straightforward.

## Features

- **Free-form tournament system** — any set of games among a group of participants can be represented as rounds and a cross-table. Supports Swiss, McMahon, round-robin, matches, olympiad, and mixed formats.
- **Role-based access** — users, managers, and admins with Firestore security rules.
- **Authentication** — email/password and Google sign-in via Firebase Auth.
- **Internationalization** — English and Russian UI.
- **Responsive UI** — Tailwind CSS v4 + daisyui.

## Tech Stack

- **Build tool:** Vite 8
- **Framework:** React 19 + TypeScript 6
- **Routing:** React Router 7
- **Styling:** Tailwind CSS 4 + daisyui 5
- **State & Server Cache:** TanStack Query 5
- **Backend (MVP):** Firebase Auth + Cloud Firestore
- **Validation:** Zod 4
- **Testing:** Vitest + happy-dom + React Testing Library
- **Utilities:** uuidv7

## Project Structure

```
schemas/              # Domain schemas and value objects (JSONC + TypeScript)
src/
  components/         # React components
  context/            # React contexts (AuthContext)
  domain/             # Domain models and Zod schemas
  i18n/               # i18n setup
  locales/            # Translation files (en, ru)
  pages/              # Route-level pages
  services/           # Service layer (Firebase abstraction, repositories)
  test/               # Test setup
  types/              # TypeScript domain types
  App.tsx             # Application root with routing
  main.tsx            # Entry point
  index.css           # Tailwind + daisyui theme configuration
firestore.rules       # Firestore security rules
firebase.json         # Firebase hosting configuration
```

## Architecture Notes

The project follows a layered architecture to minimize vendor lock-in:

- **`src/domain/`** — pure TypeScript models and Zod schemas.
- **`src/services/`** — Firebase-specific implementations hidden behind interfaces (e.g., repository abstractions).
- **`src/context/`** and **`src/components/`** — presentation and application state.

This isolation makes it possible to replace Firebase Auth/Firestore with a custom backend (e.g., MongoDB or a relational database) without rewriting UI or domain logic.

## Firestore Security Rules

Rules are defined in `firestore.rules`. Key concepts:

- **Users** — read/create/update own profile; admins have full access.
- **Associations** — public read; create/update/delete restricted to admins and managers.
- **Players** — public read; create/update/delete by admins or managers of the primary association.
- **Tournaments** — public read except drafts; write access for owner, host-association managers, and admins.
- **Events** — public read; write access for owner, host-association managers, and admins.

Admin role is checked via Firebase Custom Claims (`request.auth.token.admin == true`).

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once |
| `npm run test:ui` | Run Vitest with UI |

## Environment Variables

Create a `.env.local` file in the project root with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure Firebase in `.env.local`.
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the URL shown in the terminal (usually `http://localhost:5173/`).

## Domain Entities

Core collections stored in Firestore:

- **tournaments** — tournament metadata, games, participants, status, and time control.
- **players** — shogi players with ratings and association links.
- **associations** — groups that own players, tournaments, and events.
- **events** — groupings of tournaments (championship stages, leagues, etc.).
- **users** — application user profiles with locale-specific names.

See `schemas/` for detailed field definitions.

## Roadmap

- [ ] Tournament creation and editing forms
- [ ] Cross-table and round management
- [ ] Result entry and status transitions
- [ ] Public tournament pages
- [ ] Player profiles and rating history
- [ ] Event management
- [ ] Admin dashboard
- [ ] Backend migration path documentation

## License

MIT
