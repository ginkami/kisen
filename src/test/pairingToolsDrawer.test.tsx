import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PairingToolsDrawer } from '../components/tournament/PairingToolsDrawer.tsx'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

describe('PairingToolsDrawer', () => {
  it('renders the localized title when open', () => {
    render(<PairingToolsDrawer isOpen onClose={() => {}} />)

    expect(screen.getByText('tournament.edit.pairingTools.title')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<PairingToolsDrawer isOpen onClose={onClose} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'tournament.edit.pairingTools.close' })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<PairingToolsDrawer isOpen onClose={onClose} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
