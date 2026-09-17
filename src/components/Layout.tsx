import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BsBoxArrowRight, BsGear } from 'react-icons/bs'
import { LanguageSwitcher } from './LanguageSwitcher.tsx'
import { UserMenu } from './UserMenu.tsx'
import { NewTournamentButton } from './NewTournamentButton.tsx'
import { AdminDrawer } from './AdminDrawer.tsx'
import { BlockedNoticeBanner } from './BlockedNoticeBanner.tsx'
import { useAppSettings } from '../hooks/useAppSettings.ts'
import { useAuth } from '../context/AuthContext.tsx'

export interface LayoutOutletContext {
  setHasUnsavedChanges: (value: boolean) => void
  closeAdminDrawer: () => void
  isPairingToolsOpen: boolean
  setPairingToolsOpen: (value: boolean) => void
}

export function Layout() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading } = useAuth()

  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  // Open state of the tournament edit page's "Pairing assistant" drawer.
  // The state lives here so both side drawers can close each other.
  const [isPairingToolsOpen, setIsPairingToolsOpen] = useState(false)
  const { pathname } = useLocation()
  // Testing-mode lock: hides the guest auth buttons when enabled by an admin.
  const appSettings = useAppSettings()
  // No buttons until the settings snapshot arrives — prevents the flicker.
  const settingsLoading = appSettings === null

  // The admin drawer is only meaningful for an authenticated session.
  useEffect(() => {
    if (!isAuthenticated) {
      setIsAdminOpen(false)
    }
  }, [isAuthenticated])

  // The pairing tools drawer is only meaningful on the tournament edit page's
  // pairings tab; drop the open state on navigation.
  useEffect(() => {
    setIsPairingToolsOpen(false)
  }, [pathname])

  const openAdmin = () => setIsAdminOpen(true)
  const closeAdmin = () => setIsAdminOpen(false)
  const toggleAdmin = () => {
    // The two side drawers are mutually exclusive (they overlap on mobile).
    setIsPairingToolsOpen(false)
    setIsAdminOpen((prev) => !prev)
  }
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
          {!settingsLoading && (isAuthenticated || !appSettings?.lockLogin) && (
            <NewTournamentButton hasUnsavedChanges={hasUnsavedChanges} />
          )}
          <LanguageSwitcher />

          {isLoading || settingsLoading ? (
            <span className="loading loading-spinner loading-sm text-primary-content" />
          ) : isAuthenticated ? (
            <UserMenu onOpenAdmin={openAdmin} />
          ) : appSettings?.lockLogin ? null : (
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

      <BlockedNoticeBanner />

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
          <Outlet context={{ setHasUnsavedChanges, closeAdminDrawer: closeAdmin, isPairingToolsOpen, setPairingToolsOpen: setIsPairingToolsOpen }} />
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
