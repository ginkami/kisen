import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { EventPickerModal } from '../components/tournament/EventPickerModal.tsx'
import type { Event } from '../domain/event.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'ru' } }),
}))

const authState = vi.hoisted(() => ({
  user: null as unknown,
  firebaseUser: null as unknown,
  isAuthenticated: true,
}))

vi.mock('../context/AuthContext.tsx', () => ({
  useAuth: () => authState,
}))

const associationsState = vi.hoisted(() => ({
  associations: [] as Array<{ id: string }>,
}))

vi.mock('../hooks/useAssociations.ts', () => ({
  useMyAssociations: () => ({ data: associationsState.associations }),
  useAssociationsByIds: () => [],
}))

const editableEventsState = vi.hoisted(() => ({
  events: [] as Event[],
}))

vi.mock('../hooks/useEvents.ts', () => ({
  useEditableEvents: () => ({ data: editableEventsState.events, isLoading: false }),
}))

function makeEvent(part: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    slug: 'event-1',
    createdBy: 'creator-1',
    hostAssociation: null,
    regulations: [],
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    startYearMonth: '202609',
    locales: {
      ru: { title: 'Мероприятие 1' },
      en: { title: 'Event 1' },
    },
    ...part,
  } as Event
}

function renderPicker(defaultMonth = '2026-09') {
  return render(
    <EventPickerModal
      selectedId={null}
      onSelect={vi.fn()}
      onClose={vi.fn()}
      defaultMonth={defaultMonth}
    />
  )
}

beforeEach(() => {
  authState.user = { role: 'manager' }
  authState.firebaseUser = { uid: 'user-1' }
  associationsState.associations = [{ id: 'assn-a' }]
  editableEventsState.events = []
})

describe('EventPickerModal', () => {
  it('offers only the events returned by the editable listing for the selected month', async () => {
    editableEventsState.events = [
      makeEvent({ id: 'own', createdBy: 'user-1', locales: { ru: { title: 'Своё' }, en: { title: 'Own' } } }),
      makeEvent({
        id: 'assn',
        createdBy: 'someone-else',
        hostAssociation: 'assn-a',
        locales: { ru: { title: 'Ассоциации' }, en: { title: 'Association' } },
      }),
      makeEvent({
        id: 'other-month',
        createdBy: 'user-1',
        startYearMonth: '202610',
        locales: { ru: { title: 'Другой месяц' }, en: { title: 'Other month' } },
      }),
    ]
    renderPicker()

    await waitFor(() => {
      expect(screen.getByText('Своё')).toBeTruthy()
    })
    expect(screen.getByText('Ассоциации')).toBeTruthy()
    expect(screen.queryByText('Другой месяц')).toBeNull()
    // The "no parent event" option is always available.
    expect(screen.getByText('tournament.edit.noParentEvent')).toBeTruthy()
  })

  it('shows the empty-state message when no editable events exist for the month', () => {
    renderPicker()

    expect(screen.getByText('tournament.edit.noEvents')).toBeTruthy()
    expect(screen.getByText('tournament.edit.noParentEvent')).toBeTruthy()
  })
})