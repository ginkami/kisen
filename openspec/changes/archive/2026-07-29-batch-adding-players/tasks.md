## 1. Repository layer

- [ ] 1.1 Add `listAll(): Promise<Player[]>` to `PlayerRepository` interface in `src/services/repository.ts`
- [ ] 1.2 Implement `listAll` in `FirestorePlayerRepository` — query entire `players` collection

## 2. PlayerService — CSV import logic

- [ ] 2.1 Define `ImportResult` interface (`added`, `updated`, `invalid` counts + `errors: { row: number; reason: string }[]`)
- [ ] 2.2 Implement CSV parsing: read file as text, split by lines, split each line by `;`, skip header row
- [ ] 2.3 Implement rank conversion: regex `^(\d+)\s*(Dan|Kyu)$` → `Nd` / `Nk`
- [ ] 2.4 Implement validation: at least one locale with both names, nationality 2 chars, rank format if present, rating is number if present, residence 2 chars if present
- [ ] 2.5 Implement dedup: `listAll` → build index by (familyName, givenName) per locale
- [ ] 2.6 Implement `importFromCsv(file: File, createdBy: string): Promise<ImportResult>` — parse, validate, dedup, create/update per row

## 3. UI — BulkImportResultModal

- [ ] 3.1 Create `src/components/BulkImportResultModal.tsx` — modal showing added/updated/invalid counts + error list
- [ ] 3.2 Props: `isOpen`, `result: ImportResult | null`, `error: string | null`, `onClose`

## 4. UI — AdminDrawer button

- [ ] 4.1 Add bulk-import button (icons `BsPeople BsFiletypeCsv BsPlus`) visible only when `user?.role === 'admin'`
- [ ] 4.2 Add hidden `<input type="file" accept=".csv">` triggered by button click
- [ ] 4.3 Add drag-and-drop handlers (`onDrop`, `onDragOver`) on the button
- [ ] 4.4 Add loading state: replace button content with spinner during processing
- [ ] 4.5 Wire up `playerService.importFromCsv` call, show `BulkImportResultModal` on completion

## 5. Translations

- [ ] 5.1 Add keys to `src/locales/ru/translation.json`: `admin.bulkImport`, `admin.bulkImportResults`, `admin.added`, `admin.updated`, `admin.invalid`, `admin.errors.invalidFile`, `admin.errors.network`, `admin.errors.firestore`
- [ ] 5.2 Add keys to `src/locales/en/translation.json` (same keys, English values)

## 6. Verification

- [ ] 6.1 Run `npm run build` — TypeScript + Vite build pass
- [ ] 6.2 Run `npm run lint` — 0 new errors