import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { EventEditForm } from '../components/event/EventEditForm.tsx'
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
  isLoading: false,
}))

vi.mock('../hooks/useAssociations.ts', () => ({
  useMyAssociations: () => ({
    data: associationsState.associations,
    isLoading: associationsState.isLoading,
  }),
  useAssociationsByIds: () => [],
}))

vi.mock('../services/regulationService.ts', () => ({
  regulationService: {
    listEditable: vi.fn(() => Promise.resolve([])),
  },
}))

const eventFormState = vi.hoisted(() => ({
  event: null as Event | null,
}))

vi.mock('../hooks/useEventForm.ts', () => ({
  useEventForm: () => ({
    event: eventFormState.event,
    formState: makeFormState(),
    isLoading: false,
    loadError: null,
    isDirty: false,
    isSaving: false,
    isDeleting: false,
    saveError: null,
    deleteError: null,
    validationErrors: {},
    clearSaveError: vi.fn(),
    clearDeleteError: vi.fn(),
    updateLocale: vi.fn(),
    updateBasic: vi.fn(),
    save: vi.fn(),
    deleteEvent: vi.fn(),
    isNew: false,
    slugTaken: false,
    addRegulation: vi.fn(),
    removeRegulation: vi.fn(),
  }),
}))

function makeFormState() {
  return {
    slug: 'test-event',
    locales: {
      ru: { title: 'Тестовое мероприятие', description: '' },
      en: { title: 'Test event', description: '' },
    },
    hostAssociation: '',
    regulations: [],
  }
}

function makeEvent(part: Partial<Event> = {}): Event {
  return {
    id: '00000000-0000-7000-8000-000000000001',
    slug: 'test-event',
    createdBy: 'creator-1',
    hostAssociation: null,
    regulations: [],
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    startYearMonth: '202609',
    locales: {
      ru: { title: 'Тестовое мероприятие' },
      en: { title: 'Test event' },
    },
    ...part,
  } as Event
}

function makeUser(role: string) {
  return { role }
}

function makeFirebaseUser(uid: string) {
  return { uid }
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EventEditForm eventId="00000000-0000-7000-8000-000000000001" />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  authState.user = makeUser('user')
  authState.firebaseUser = makeFirebaseUser('user-1')
  associationsState.associations = []
  associationsState.isLoading = false
  eventFormState.event = null
})

describe('EventEditForm access guard', () => {
  it('shows the no-access message instead of the form for an unrelated user', () => {
    eventFormState.event = makeEvent({ createdBy: 'creator-1' })
    renderForm()

    expect(screen.getByText('event.edit.errors.noAccess')).toBeTruthy()
    expect(screen.queryByText('event.edit.save')).toBeNull()
    expect(screen.queryByText('event.edit.delete')).toBeNull()
  })

  it('renders the full form when the event was created by the current user', () => {
    eventFormState.event = makeEvent({ createdBy: 'user-1' })
    renderForm()

    expect(screen.getByText('event.edit.save')).toBeTruthy()
    expect(screen.getByText('event.edit.delete')).toBeTruthy()
    expect(screen.queryByText('event.edit.errors.noAccess')).toBeNull()
  })

  it('renders the full form when the host association is managed by the current user', () => {
    eventFormState.event = makeEvent({
      createdBy: 'creator-1',
      hostAssociation: 'assn-a',
    })
    associationsState.associations = [{ id: 'assn-a' }]
    renderForm()

    expect(screen.getByText('event.edit.save')).toBeTruthy()
    expect(screen.queryByText('event.edit.errors.noAccess')).toBeNull()
  })

  it('renders the full form for admins regardless of ownership', () => {
    authState.user = makeUser('admin')
    eventFormState.event = makeEvent({ createdBy: 'creator-1' })
    renderForm()

    expect(screen.getByText('event.edit.save')).toBeTruthy()
    expect(screen.queryByText('event.edit.errors.noAccess')).toBeNull()
  })

  it('keeps showing the spinner while the managed associations are loading', () => {
    eventFormState.event = makeEvent({ createdBy: 'creator-1' })
    associationsState.isLoading = true
    const { container } = renderForm()

    expect(container.querySelector('.loading')).not.toBeNull()
    expect(screen.queryByText('event.edit.errors.noAccess')).toBeNull()
    expect(screen.queryByText('event.edit.save')).toBeNull()
  })
})