import { z } from 'zod'
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebaseConfig.ts'

const APP_SETTINGS_COLLECTION = 'app'
const APP_SETTINGS_DOC = 'settings'

export const appSettingsSchema = z.object({
  /** Hide the login page and the guest auth buttons in the header. */
  lockLogin: z.boolean().default(false),
  /** The hash fragment that unlocks /login while lockLogin is on. */
  loginHash: z.string().default(''),
})

export type AppSettings = z.infer<typeof appSettingsSchema>

export const DEFAULT_APP_SETTINGS: AppSettings = appSettingsSchema.parse({})

/**
 * Pure: parse a raw Firestore document of the `app/settings` singleton.
 * A missing document (or missing fields) falls back to the defaults.
 */
export function parseAppSettings(data: Record<string, unknown> | undefined): AppSettings {
  return appSettingsSchema.parse(data ?? {})
}

function settingsRef() {
  return doc(db, APP_SETTINGS_COLLECTION, APP_SETTINGS_DOC)
}

export async function getAppSettings(): Promise<AppSettings> {
  const snapshot = await getDoc(settingsRef())
  return parseAppSettings(snapshot.data())
}

/** Live subscription: every change of the singleton is pushed to `onNext`. */
export function subscribeAppSettings(onNext: (settings: AppSettings) => void): () => void {
  return onSnapshot(
    settingsRef(),
    (snapshot) => onNext(parseAppSettings(snapshot.data())),
    () => onNext(DEFAULT_APP_SETTINGS), // read problems → unlocked fallback
  )
}

/** Admin-only per the Firestore rules; the client just writes the values. */
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await setDoc(settingsRef(), settings)
}
