import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRightStartOnRectangleIcon,
  TrophyIcon,
  UserCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext.tsx'

interface UserMenuProps {
  onOpenAdmin: () => void
}

export function UserMenu({ onOpenAdmin }: UserMenuProps) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()

  const displayName = user
    ? user.locales[i18n.language as keyof typeof user.locales]?.displayName ||
      user.email
    : ''

  return (
    <div className="dropdown dropdown-end dropdown-hover">
      <button
        type="button"
        tabIndex={0}
        className="btn btn-secondary btn-sm"
        aria-label={t('auth.profile')}
      >
        <UserIcon className="h-5 w-5" />
        <span className="truncate">{displayName}</span>
      </button>

      <ul
        tabIndex={0}
        className="dropdown-content menu z-[60] w-56 rounded-box bg-neutral p-2 shadow"
      >
        <li className="menu-title text-primary-content">
          <span className="truncate">{displayName}</span>
        </li>
        <li className="divider my-2 h-[2px] bg-base-100" />
        <li>
          <Link to="/profile">
            <UserCircleIcon className="h-4 w-4" />
            {t('profile.title')}
          </Link>
        </li>
        <li>
          <button type="button" onClick={onOpenAdmin}>
            <TrophyIcon className="h-4 w-4" />
            {t('admin.title')}
          </button>
        </li>
        <li>
          <button type="button" onClick={() => void logout()}>
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
            {t('auth.logout')}
          </button>
        </li>
      </ul>
    </div>
  )
}
