import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BlockedNoticeBanner } from '../components/BlockedNoticeBanner.tsx'
import { clearBlockedNotice, setBlockedNotice } from '../context/blockedNotice.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

describe('BlockedNoticeBanner', () => {
  it('is hidden when no notice flag is stored', () => {
    clearBlockedNotice()
    render(<BlockedNoticeBanner />)
    expect(screen.queryByText('auth.errors.userBlocked')).toBeNull()
  })

  it('appears when the blocked notice is set, and disappears on dismissal', () => {
    clearBlockedNotice()
    render(<BlockedNoticeBanner />)

    act(() => {
      setBlockedNotice()
    })
    expect(screen.getByText('auth.errors.userBlocked')).toBeTruthy()

    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('auth.errors.userBlocked')).toBeNull()
    expect(sessionStorage.getItem('auth.blockedNotice')).toBeNull()
  })
})