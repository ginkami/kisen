import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.tsx'

export function AuthForm() {
  const { t } = useTranslation()
  const { signIn, signUp, signInGoogle } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (isRegistering) {
        await signUp({ email, password, displayName })
      } else {
        await signIn({ email, password })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setError(null)
    try {
      await signInGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google auth error')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
    >
      <h2 className="text-lg font-semibold text-slate-800">
        {isRegistering ? t('auth.register') : t('auth.login')}
      </h2>

      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>
      )}

      {isRegistering && (
        <div>
          <label
            htmlFor="displayName"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            {t('auth.displayName')}
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required={isRegistering}
            placeholder={t('auth.displayName')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {t('auth.email')}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder={t('auth.email')}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          {t('auth.password')}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder={t('auth.password')}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
      >
        {isRegistering ? t('auth.register') : t('auth.login')}
      </button>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full rounded-lg bg-red-50 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
      >
        {t('auth.loginWithGoogle')}
      </button>

      <button
        type="button"
        onClick={() => setIsRegistering((prev) => !prev)}
        className="w-full text-sm text-slate-500 underline transition-colors hover:text-slate-700"
      >
        {isRegistering ? t('auth.login') : t('auth.register')}
      </button>
    </form>
  )
}
