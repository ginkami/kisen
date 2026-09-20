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

  it('selects a country on mousedown and closes the list', () => {
    const onChange = vi.fn()
    const { container } = render(
      <CountrySelect value="" onChange={onChange} lang="en" placeholder="No country" />,
    )
    fireEvent.click(container.querySelector('button') as HTMLButtonElement)

    const options = container.querySelectorAll('ul li button')
    const country = Array.from(options).find((b) => b.textContent !== 'No country')!
    fireEvent.mouseDown(country)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(container.querySelector('ul')).toBeNull()
  })

  it('keeps the list open when pressing inside it (search input focus)', () => {
    const { container } = render(
      <CountrySelect value="" onChange={vi.fn()} lang="en" placeholder="No country" />,
    )
    fireEvent.click(container.querySelector('button') as HTMLButtonElement)

    // A press on the search input (inside the root) must not close the list.
    fireEvent.mouseDown(container.querySelector('ul input') as HTMLInputElement)

    expect(container.querySelector('ul')).not.toBeNull()
  })

  it('closes on a press outside the dropdown', () => {
    const { container } = render(
      <CountrySelect value="" onChange={vi.fn()} lang="en" placeholder="No country" />,
    )
    fireEvent.click(container.querySelector('button') as HTMLButtonElement)
    expect(container.querySelector('ul')).not.toBeNull()

    fireEvent.mouseDown(document.body)

    expect(container.querySelector('ul')).toBeNull()
  })
})
