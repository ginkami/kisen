import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRightEndOnRectangleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { LanguageSwitcher } from './LanguageSwitcher.tsx'
import { UserMenu } from './UserMenu.tsx'
import { NewTournamentButton } from './NewTournamentButton.tsx'
import { AdminDrawer } from './AdminDrawer.tsx'
import { useAuth } from '../context/AuthContext.tsx'

const ADMIN_AUTO_OPEN_PATHS = ['/tournaments/new']

function shouldAutoOpenAdmin(pathname: string) {
  return ADMIN_AUTO_OPEN_PATHS.includes(pathname)
}

export function Layout() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading } = useAuth()
  const { pathname } = useLocation()

  const [isAdminOpen, setIsAdminOpen] = useState(false)

  useEffect(() => {
    if (
      isAuthenticated &&
      shouldAutoOpenAdmin(pathname) &&
      window.matchMedia('(min-width: 1024px)').matches
    ) {
      setIsAdminOpen(true)
    }
  }, [isAuthenticated, pathname])

  const openAdmin = () => setIsAdminOpen(true)
  const closeAdmin = () => setIsAdminOpen(false)
  const toggleAdmin = () => setIsAdminOpen((prev) => !prev)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="navbar bg-primary text-primary-content">
        <div className="navbar-start">
          <Link to="/" className="logo">
            shogi<b>·</b>world
          </Link>
        </div>

        <div className="navbar-end gap-2">
          <NewTournamentButton />
          <LanguageSwitcher />

          {isLoading ? (
            <span className="loading loading-spinner loading-sm text-primary-content" />
          ) : isAuthenticated ? (
            <UserMenu onOpenAdmin={openAdmin} />
          ) : (
            <Link
              to="/login"
              className="btn btn-secondary btn-sm"
            >
              <ArrowRightEndOnRectangleIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('auth.login')}</span>
            </Link>
          )}
        </div>
      </header>

      <div className="relative flex flex-1">
        <main
          className={[
            'flex-1 bg-base-100 p-4 transition-all duration-300 ease-in-out',
            isAdminOpen ? 'lg:mr-0' : '',
          ].join(' ')}
        >
          <Outlet />
        </main>

        <AdminDrawer isOpen={isAdminOpen} onClose={closeAdmin} />
      </div>

      {/* Sticky admin tab */}
      {isAuthenticated && !isAdminOpen && (
        <button
          type="button"
          onClick={toggleAdmin}
          className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-box bg-secondary p-3 text-secondary-content shadow-lg"
          aria-label={t('admin.title')}
        >
          <TrophyIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}
