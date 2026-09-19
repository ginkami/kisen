import { render, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CountrySelect } from '../components/tournament/CountrySelect.tsx'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

describe('CountrySelect', () => {
  it('does not keep the country list in the DOM while closed', () => {
    const { container } = render(
      <CountrySelect value="" onChange={vi.fn()} lang="en" placeholder="No country" />,
    )

    // Performance: the ~250 flag buttons must not exist in the hidden DOM,
    // otherwise every keystroke re-diffs them for every participant row.
    expect(container.querySelectorAll('ul li button')).toHaveLength(0)
  })

  it('renders the country list only while open', () => {
    const { container } = render(
      <CountrySelect value="" onChange={vi.fn()} lang="en" placeholder="No country" />,
    )

    fireEvent.click(container.querySelector('button') as HTMLButtonElement)

    const options = container.querySelectorAll('ul li button')
    expect(options.length).toBeGreaterThan(100)
  })
})
