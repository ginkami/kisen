import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './components/LanguageSwitcher.tsx'
import { AuthForm } from './components/AuthForm.tsx'
import { UserProfile } from './components/UserProfile.tsx'
import { useAuth } from './context/AuthContext.tsx'
import './i18n'

function App() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading } = useAuth()

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-6 text-slate-800">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            {t('auth.title')}
          </h1>
          <LanguageSwitcher />
        </div>

        {isLoading ? (
          <p className="text-center font-medium text-indigo-600">Loading...</p>
        ) : isAuthenticated ? (
          <UserProfile />
        ) : (
          <AuthForm />
        )}
      </section>
    </main>
  )
}

export default App
