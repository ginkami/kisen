/**
 * Shared state for the "user blocked" notice: the auth context stores the
 * flag when a session is blocked (rejected sign-in or forced logout), and
 * the BlockedNoticeBanner reacts to the change event so the notice appears
 * without a page reload.
 */
export const BLOCKED_NOTICE_KEY = 'auth.blockedNotice'
export const BLOCKED_NOTICE_EVENT = 'auth.blockedNotice.changed'

export function setBlockedNotice(): void {
  sessionStorage.setItem(BLOCKED_NOTICE_KEY, '1')
  window.dispatchEvent(new Event(BLOCKED_NOTICE_EVENT))
}

export function clearBlockedNotice(): void {
  sessionStorage.removeItem(BLOCKED_NOTICE_KEY)
}

export function hasBlockedNotice(): boolean {
  return sessionStorage.getItem(BLOCKED_NOTICE_KEY) === '1'
}