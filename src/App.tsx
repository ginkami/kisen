import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { LanguageSwitcher } from './components/LanguageSwitcher.tsx'
import './i18n'

// Simulated API response shape.
interface Greeting {
  title: string
  message: string
}

// Fake async fetch that resolves after one second.
function fetchGreeting(): Promise<Greeting> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        title: 'Hello, Vite + React + Tailwind!',
        message:
          'This page is powered by TanStack Query v5 and styled with Tailwind CSS v4.',
      })
    }, 1000)
  })
}

function App() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['greeting'],
    queryFn: fetchGreeting,
  })

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-6 text-slate-800">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            {t('auth.title')}
          </h1>
          <LanguageSwitcher />
        </div>

        <div className="mb-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t('auth.email')}
            </label>
            <input
              type="email"
              placeholder={t('auth.email')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t('auth.password')}
            </label>
            <input
              type="password"
              placeholder={t('auth.password')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            {t('auth.login')}
          </button>
          <button
            type="button"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            {t('auth.register')}
          </button>
          <button
            type="button"
            className="w-full rounded-lg bg-red-50 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            {t('auth.loginWithGoogle')}
          </button>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-6">
          {isLoading && (
            <p className="text-center font-medium text-indigo-600">Loading...</p>
          )}

          {isError && (
            <p className="text-center font-medium text-red-500">
              Something went wrong.
            </p>
          )}

          {data && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-indigo-700">
                {data.title}
              </h2>
              <p className="leading-relaxed text-slate-600">{data.message}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
