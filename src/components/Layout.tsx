import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BsBoxArrowRight, BsGear } from 'react-icons/bs'
import { LanguageSwitcher } from './LanguageSwitcher.tsx'
import { UserMenu } from './UserMenu.tsx'
import { NewTournamentButton } from './NewTournamentButton.tsx'
import { AdminDrawer } from './AdminDrawer.tsx'
import { useAuth } from '../context/AuthContext.tsx'

export interface LayoutOutletContext {
  setHasUnsavedChanges: (value: boolean) => void
}

export function Layout() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading } = useAuth()

  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const openAdmin = () => setIsAdminOpen(true)
  const closeAdmin = () => setIsAdminOpen(false)
  const toggleAdmin = () => setIsAdminOpen((prev) => !prev)
  const version = import.meta.env.VITE_APP_VERSION

  return (
    <div className="flex min-h-screen flex-col">
      <header className="navbar bg-primary text-primary-content">
        <div className="navbar-start">
          <Link to="/" className="logo">
            shogi world
          </Link>
        </div>

        <div className="navbar-end gap-2">
          <NewTournamentButton hasUnsavedChanges={hasUnsavedChanges} />
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
              <BsBoxArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">{t('auth.login')}</span>
            </Link>
          )}
        </div>
      </header>

      <div className="relative flex flex-1">
        <AdminDrawer
          isOpen={isAdminOpen}
          onClose={closeAdmin}
          hasUnsavedChanges={hasUnsavedChanges}
        />

        <main
          className={[
            'flex-1 bg-base-100 p-4 transition-all duration-300 ease-in-out',
            isAdminOpen ? 'lg:ml-0' : '',
          ].join(' ')}
        >
          <Outlet context={{ setHasUnsavedChanges }} />
        </main>
      </div>

      {/* Sticky admin tab */}
      {isAuthenticated && !isAdminOpen && (
        <button
          type="button"
          onClick={toggleAdmin}
          className="fixed left-0 top-17 z-40 -translate-y-1/2 rounded-r-box bg-secondary p-3 text-secondary-content shadow-lg"
          aria-label={t('admin.title')}
        >
          <BsGear className="h-6 w-6" />
        </button>
      )}
      <footer className="bg-base-100 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Link to="/" className="logo" style={{ '--logo-after': `'v${version}'` } as React.CSSProperties }>
            shogi world
          </Link>
        </div>
      </footer>
    </div>
  )
}
