import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ParticipantsSection } from '../components/tournament/ParticipantsSection.tsx'
import type { ParticipantRow } from '../hooks/useTournamentForm.ts'
import type { SupportedLocale } from '../domain/locale.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}))

vi.mock('../components/tournament/ParticipantRow.tsx', () => ({
  ParticipantRow: () => <div data-testid="participant-row" />,
}))

const emptyLocales = {} as ParticipantRow['locales']

function makeRow(overrides: Partial<ParticipantRow> = {}): ParticipantRow {
  return {
    rowId: 'row-1',
    id: 0,
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

function renderSection(participants: ParticipantRow[]) {
  return render(
    <ParticipantsSection
      participants={participants}
      activeLocale={'ru' as SupportedLocale}
      onLocaleChange={vi.fn()}
      onAdd={vi.fn()}
      onUpdate={vi.fn()}
      onRemove={vi.fn()}
    />,
  )
}

function summaryName(container: HTMLElement): string {
  const name = container.querySelector('summary b')
  expect(name).not.toBeNull()
  return name?.textContent ?? ''
}

describe('ParticipantsSection summary', () => {
  it('renders the em dash placeholder without a comma when there are no participants', () => {
    const { container } = renderSection([])

    expect(summaryName(container)).toBe('—')
    expect(container.querySelector('summary')?.textContent).not.toContain(',')
  })

  it('renders the given name alone without a leading comma when the family name is empty', () => {
    const { container } = renderSection([
      makeRow({
        locales: {
          ru: { familyName: '', givenName: 'Иван', title: '', location: '' },
          en: { familyName: '', givenName: 'Ivan', title: '', location: '' },
        },
      }),
    ])

    expect(summaryName(container)).toBe('Иван')
  })

  it('joins the family and given names with a comma', () => {
    const { container } = renderSection([makeRow()])

    expect(summaryName(container)).toBe('Иванов, Иван')
  })

  it('falls back to the em dash for a participant with an empty locale object', () => {
    const { container } = renderSection([makeRow({ locales: emptyLocales })])

    expect(summaryName(container)).toBe('—')
  })
})
