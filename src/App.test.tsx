import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: () => ({
    prefetchQuery: vi.fn(),
    setQueryData: vi.fn(),
    removeQueries: vi.fn(),
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ru', changeLanguage: vi.fn() },
  }),
}))

vi.mock('./context/AuthContext.tsx', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInGoogle: vi.fn(),
    logout: vi.fn(),
    user: null,
    firebaseUser: null,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { useQuery } from '@tanstack/react-query'

function mockedUseQuery() {
  return vi.mocked(useQuery)
}

describe('App', () => {
  it('renders auth form when not authenticated', () => {
    mockedUseQuery().mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    } as ReturnType<typeof useQuery>)

    render(<App />)

    expect(screen.getByText('auth.title')).toBeInTheDocument()
    expect(screen.getByText('auth.login')).toBeInTheDocument()
  })
})
