/**
 * One-time backfill: computes `startAt` (earliest scheduledAt among rounds
 * and events) for existing tournament documents that lack it. Documents
 * without `startAt` are excluded from the home page's ordered queries until
 * backfilled.
 *
 * Usage (from the project root):
 *   set VITE_FIREBASE_* env vars or edit the config below, then
 *   node scripts/backfill-tournament-start-at.mjs <email> <password>
 *
 * The credentials must belong to a user with write access to tournaments
 * (admin). Run `firebase deploy --only firestore:indexes` first if the
 * ordered queries are used elsewhere.
 */
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  writeBatch,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'

// Minimal env parser (no dotenv dependency in scripts).
function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // .env.local is optional
  }
}
loadEnv()

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const [email, password] = process.argv.slice(2)
if (!email || !password) {
  console.error('Usage: node scripts/backfill-tournament-start-at.mjs <email> <password>')
  process.exit(1)
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

function computeStartAt(data) {
  const schedule = data.schedule ?? {}
  const dates = []
  for (const round of schedule.rounds ?? []) {
    if (round?.scheduledAt) dates.push(round.scheduledAt)
  }
  for (const event of schedule.events ?? []) {
    if (event?.scheduledAt) dates.push(event.scheduledAt)
  }
  if (dates.length === 0) return null
  return new Date(Math.min(...dates.map((d) => new Date(d).getTime())))
}

const PAGE_SIZE = 400
let scanned = 0
let written = 0
let cursor = null

async function signIn() {
  try {
    await signInWithEmailAndPassword(auth, email, password)
  } catch (err) {
    // Optional: allow an explicit pre-authenticated emulator session.
    console.warn('Email sign-in failed; continuing with the current auth state.', err)
  }
}

async function nextPage() {
  const constraints = [limit(PAGE_SIZE)]
  if (cursor) constraints.push(startAfter(cursor))
  const q = query(collection(db, 'tournaments'), ...constraints)
  const snapshot = await getDocs(q)
  cursor = snapshot.docs[snapshot.docs.length - 1] ?? null
  return snapshot.docs
}

await signIn()

let hasMore = true
while (hasMore) {
  const docs = await nextPage()
  if (docs.length === 0) break

  const batch = writeBatch(db)
  let batchWrites = 0

  for (const docSnap of docs) {
    scanned++
    const data = docSnap.data()
    if (data.startAt) continue

    const startAt = computeStartAt(data)
    if (!startAt) continue

    batch.update(doc(db, 'tournaments', docSnap.id), { startAt })
    written++
    batchWrites++
  }

  if (batchWrites > 0) {
    await batch.commit()
  }

  hasMore = docs.length === PAGE_SIZE
  console.log(`Scanned ${scanned} documents, wrote ${written} so far...`)
}

console.log(`Done. Scanned ${scanned} documents, backfilled ${written} with startAt.`)
