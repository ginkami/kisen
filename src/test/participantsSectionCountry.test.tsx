import { fireEvent, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { ParticipantsSection } from '../components/tournament/ParticipantsSection.tsx'
import type { ParticipantRow } from '../hooks/useTournamentForm.ts'
import type { SupportedLocale } from '../domain/locale.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ru' } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

function makeRow(overrides: Partial<ParticipantRow> = {}): ParticipantRow {
  return {
    rowId: 'row-1',
    id: 1,
    player: null,
    locales: {
      ru: { familyName: 'Иванов', givenName: 'Иван', title: '', location: '' },
      en: { familyName: 'Ivanov', givenName: 'Ivan', title: '', location: '' },
    },
    nationality: '',
    residence: '',
    ratingValue: '',
    rank: null,
    startingPoints: 0,
    ...overrides,
  }
}

describe('ParticipantsSection country select integration', () => {
  it('updates nationality through the country dropdown', () => {
    const onUpdate = vi.fn()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ParticipantsSection
          participants={[makeRow()]}
          activeLocale={'ru' as SupportedLocale}
          onLocaleChange={vi.fn()}
          onAdd={vi.fn()}
          onUpdate={onUpdate}
          onRemove={vi.fn()}
        />
      </QueryClientProvider>,
    )

    const dropdown = container.querySelector('.dropdown')!
    const toggle = dropdown.querySelector(':scope > button') as HTMLButtonElement
    fireEvent.click(toggle)

    const ul = container.querySelector('ul')
    expect(ul).not.toBeNull()
    const options = Array.from(ul!.querySelectorAll('li button'))
    const target = options.find(
      (b) => b.textContent !== 'common.noCountry' && b.textContent !== 'No country',
    )!
    fireEvent.mouseDown(target)

    expect(onUpdate).toHaveBeenCalled()
    const patch = onUpdate.mock.calls[0][1] as Partial<ParticipantRow>
    expect(patch.nationality).toBeTruthy()
  })
})
