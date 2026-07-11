import { Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher.tsx'
import { useAuth } from '../context/AuthContext.tsx'

export function Layout() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 text-slate-800">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight">
            shogi·world
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {isLoading ? (
              <span className="text-sm text-slate-500">Loading...</span>
            ) : isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-700">{user?.email}</span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  {t('auth.logout')}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                {t('auth.login')}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
