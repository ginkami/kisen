import { fireEvent, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ParticipantRow } from '../components/tournament/ParticipantRow.tsx'
import { playerService } from '../services/playerService.ts'
import type { ParticipantRow as ParticipantRowType } from '../hooks/useTournamentForm.ts'
import type { Player } from '../domain/player.ts'
import type { SupportedLocale } from '../domain/locale.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'ru' } }),
}))

vi.mock('../services/playerService.ts', () => ({
  playerService: { getById: vi.fn() },
}))

vi.mock('../components/player/PlayerSearchPanel.tsx', () => ({
  PlayerSearchPanel: () => <div data-testid="player-search-panel" />,
}))

vi.mock('../components/player/PlayerEditModal.tsx', () => ({
  PlayerEditModal: () => <div data-testid="player-edit-modal" />,
}))

vi.mock('../components/tournament/CountrySelect.tsx', () => ({
  CountrySelect: () => <button type="button" />,
}))

vi.mock('../components/tournament/ExpandableField.tsx', () => ({
  ExpandableField: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

const mockedGetById = vi.mocked(playerService.getById)

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    createdBy: 'user-1',
    locales: {
      ru: { familyName: 'Петров', givenName: 'Пётр' },
      en: { familyName: 'Petrov', givenName: 'Petr' },
    },
    nationality: 'RU',
    gender: null,
    currentRating: { value: 1500, rank: '10k', locked: false },
    history: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as Player
}

function makeRow(overrides: Partial<ParticipantRowType> = {}): ParticipantRowType {
  return {
    rowId: 'row-1',
    id: 0,
    player: '11111111-1111-4111-8111-111111111111',
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

function renderRow(row: ParticipantRowType) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ParticipantRow
        row={row}
        activeLocale={'ru' as SupportedLocale}
        onUpdate={vi.fn()}
      />
    </QueryClientProvider>,
  )
}

describe('ParticipantRow linked player label', () => {
  beforeEach(() => {
    mockedGetById.mockReset()
  })

  it('shows the linked player name from the player entity, not the participant copy', async () => {
    mockedGetById.mockResolvedValue(makePlayer())
    const { container } = renderRow(makeRow())

    await waitFor(() => expect(container.textContent).toContain('Петров, Пётр'))
    expect(container.textContent).not.toContain('Иванов, Иван')
  })

  it('does not change the linked player label when participant name fields are edited', async () => {
    mockedGetById.mockResolvedValue(makePlayer())
    const { container } = renderRow(makeRow())

    await waitFor(() => expect(container.textContent).toContain('Петров, Пётр'))

    // Type into the participant's family name field.
    const familyInput = container.querySelector('input[type="text"]') as HTMLInputElement
    fireEvent.change(familyInput, { target: { value: 'ИзменённаяФамилия' } })

    expect(container.textContent).toContain('Петров, Пётр')
    expect(container.textContent).not.toContain('ИзменённаяФамилия, ')
  })

  it('falls back to the participant copy while the player query is loading', () => {
    mockedGetById.mockReturnValue(new Promise(() => {}))
    const { container } = renderRow(makeRow())

    expect(container.textContent).toContain('Иванов, Иван')
    expect(mockedGetById).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111')
  })
})
