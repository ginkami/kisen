import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: vi.fn() },
  }),
}))

import { useQuery } from '@tanstack/react-query'

function mockedUseQuery() {
  return vi.mocked(useQuery)
}

describe('App', () => {
  it('renders loading state', () => {
    mockedUseQuery().mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as ReturnType<typeof useQuery>)

    render(<App />)

    expect(screen.getByText('auth.title')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders greeting data', () => {
    mockedUseQuery().mockReturnValue({
      data: {
        title: 'Hello, Vitest!',
        message: 'Testing React with Vitest is great.',
      },
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>)

    render(<App />)

    expect(screen.getByText('auth.title')).toBeInTheDocument()
    expect(screen.getByText('Hello, Vitest!')).toBeInTheDocument()
    expect(
      screen.getByText('Testing React with Vitest is great.')
    ).toBeInTheDocument()
  })

  it('renders error state', () => {
    mockedUseQuery().mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as ReturnType<typeof useQuery>)

    render(<App />)

    expect(screen.getByText('auth.title')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
  })
})
