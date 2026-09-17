import { useEffect, useState } from 'react'
import { subscribeAppSettings } from '../services/appSettingsService.ts'
import type { AppSettings } from '../services/appSettingsService.ts'

/**
 * Live app settings via a Firestore snapshot. null while the singleton has
 * not been loaded yet — consumers treat null as "unlocked" (nothing hidden).
 */
export function useAppSettings(): AppSettings | null {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => subscribeAppSettings(setSettings), [])

  return settings
}
