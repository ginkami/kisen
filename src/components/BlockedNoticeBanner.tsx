import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BLOCKED_NOTICE_EVENT,
  clearBlockedNotice,
  hasBlockedNotice,
} from '../context/blockedNotice.ts'

/**
 * Shown after a sign-in was rejected or a session was force-terminated
 * because the user's `auth.isActive` flag flipped to false (see AuthContext).
 * The notice flag is stored in sessionStorage by the auth context and cleared
 * on dismissal.
 */
export function BlockedNoticeBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(() => hasBlockedNotice())

  useEffect(() => {
    const sync = () => setVisible(hasBlockedNotice())
    window.addEventListener(BLOCKED_NOTICE_EVENT, sync)
    return () => window.removeEventListener(BLOCKED_NOTICE_EVENT, sync)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    clearBlockedNotice()
    setVisible(false)
  }

  return (
    <div className="flex items-center justify-center mt-1">
      <div className="alert alert-warning w-fit" role="alert">
        <span className="flex-1">{t('auth.errors.userBlocked')}</span>
        <button type="button" onClick={dismiss} className="btn btn-sm btn-ghost">
          ×
        </button>
      </div>
    </div>
  )
}