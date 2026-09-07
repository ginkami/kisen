import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ManagerInviteInput } from '../components/association/ManagerInviteInput.tsx'
import { searchByFamilyName, getByEmail } from '../services/userService.ts'
import type { User } from '../types/user.ts'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../services/userService.ts', () => ({
  searchByFamilyName: vi.fn(),
  getByEmail: vi.fn(),
}))

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'found-user-1',
    email: 'found@example.com',
    role: 'user',
    locales: {
      ru: { familyName: 'Иванов', givenName: 'Иван', displayName: 'Ив' },
      en: { familyName: 'Ivanov', givenName: 'Ivan', displayName: 'Iv' },
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

function renderInput(props: { excludeEmails?: string[]; excludeUserIds?: string[] } = {}) {
  const onAddUser = vi.fn()
  const onAddEmail = vi.fn()
  render(
    <ManagerInviteInput
      locale="ru"
      excludeUserIds={props.excludeUserIds ?? []}
      excludeEmails={props.excludeEmails ?? []}
      onAddUser={onAddUser}
      onAddEmail={onAddEmail}
    />
  )
  const input = screen.getByPlaceholderText('association.edit.invitePlaceholder')
  return { input, onAddUser, onAddEmail }
}

beforeEach(() => {
  vi.mocked(searchByFamilyName).mockReset()
  vi.mocked(getByEmail).mockReset()
})

describe('ManagerInviteInput', () => {
  it('shows the registered user for a full email before selection', async () => {
    const user = makeUser()
    vi.mocked(getByEmail).mockResolvedValue(user)
    const { input, onAddUser, onAddEmail } = renderInput()

    fireEvent.change(input, { target: { value: 'Found@Example.com' } })

    await waitFor(() =>
      expect(screen.getByText('Иванов, Иван')).toBeInTheDocument()
    )
    expect(getByEmail).toHaveBeenCalledWith('found@example.com')
    expect(screen.queryByText('found@example.com')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'association.edit.select' }))
    expect(onAddUser).toHaveBeenCalledWith(user.id)
    expect(onAddEmail).not.toHaveBeenCalled()
  })

  it('asks for an explicit invite for a full email with no matching user', async () => {
    vi.mocked(getByEmail).mockResolvedValue(null)
    const { input, onAddUser, onAddEmail } = renderInput()

    fireEvent.change(input, { target: { value: 'unknown@example.com' } })

    await waitFor(() =>
      expect(screen.getByText('unknown@example.com')).toBeInTheDocument()
    )
    expect(screen.getByText('association.edit.noUsersFound')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'association.edit.inviteByEmail' })
    )
    await waitFor(() => expect(onAddEmail).toHaveBeenCalledWith('unknown@example.com'))
    expect(onAddUser).not.toHaveBeenCalled()
  })

  it('does not offer an email that is already a pending invite', async () => {
    const { input } = renderInput({ excludeEmails: ['invited@example.com'] })

    fireEvent.change(input, { target: { value: 'invited@example.com' } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getByEmail).not.toHaveBeenCalled()
    expect(screen.queryByText('invited@example.com')).not.toBeInTheDocument()
  })

  it('does not trigger any lookup while typing an incomplete email', async () => {
    const { input } = renderInput()

    fireEvent.change(input, { target: { value: 'ab@' } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(searchByFamilyName).not.toHaveBeenCalled()
    expect(getByEmail).not.toHaveBeenCalled()
  })

  it('does not offer or look up an email with a one-letter TLD', async () => {
    const { input } = renderInput()

    fireEvent.change(input, { target: { value: 'test@site.b' } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(getByEmail).not.toHaveBeenCalled()
    expect(screen.queryByText('test@site.b')).not.toBeInTheDocument()
    expect(screen.queryByText('association.edit.noUsersFound')).not.toBeInTheDocument()
  })

  it('offers an email with an unusual but valid multi-letter TLD', async () => {
    vi.mocked(getByEmail).mockResolvedValue(null)
    const { input, onAddEmail } = renderInput()

    fireEvent.change(input, { target: { value: 'test@site.bjkjkj' } })
    await waitFor(() =>
      expect(screen.getByText('test@site.bjkjkj')).toBeInTheDocument()
    )
    expect(getByEmail).toHaveBeenCalledWith('test@site.bjkjkj')

    fireEvent.click(
      screen.getByRole('button', { name: 'association.edit.inviteByEmail' })
    )
    await waitFor(() => expect(onAddEmail).toHaveBeenCalledWith('test@site.bjkjkj'))
  })

  it('does not offer a registered user who is the creator or already a manager', async () => {
    const user = makeUser()
    vi.mocked(getByEmail).mockResolvedValue(user)
    const { input, onAddUser, onAddEmail } = renderInput({
      excludeUserIds: ['found-user-1'],
    })

    fireEvent.change(input, { target: { value: 'found@example.com' } })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(screen.queryByText('Иванов, Иван')).not.toBeInTheDocument()
    expect(screen.queryByText('found@example.com')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'association.edit.select' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'association.edit.inviteByEmail' })).not.toBeInTheDocument()
    expect(screen.getByText('association.edit.noUsersFound')).toBeInTheDocument()
    expect(onAddUser).not.toHaveBeenCalled()
    expect(onAddEmail).not.toHaveBeenCalled()
  })

  it('searches users by family name without @', async () => {
    const users = [makeUser()]
    vi.mocked(searchByFamilyName).mockResolvedValue(users)
    const { input } = renderInput()

    fireEvent.change(input, { target: { value: 'Ива' } })

    await waitFor(() =>
      expect(screen.getByText('Иванов, Иван')).toBeInTheDocument()
    )
    expect(searchByFamilyName).toHaveBeenCalledWith('Ива')
  })
})
