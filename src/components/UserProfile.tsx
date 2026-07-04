import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.tsx'

export function UserProfile() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  return (
    <div className="mb-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <h2 className="text-lg font-semibold text-slate-800">
        {t('auth.title')}
      </h2>

      <div className="space-y-1 text-sm text-slate-700">
        <p>
          <span className="font-medium">Email:</span> {user?.email}
        </p>
        <p>
          <span className="font-medium">ID:</span> {user?.id}
        </p>
        <p>
          <span className="font-medium">Role:</span> {user?.role}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void logout()}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
      >
        {t('auth.logout')}
      </button>
    </div>
  )
}
