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
      className="card bg-base-200 mb-6 space-y-3 p-4 shadow"
    >
      <h2 className="card-title">
        {isRegistering ? t('auth.register') : t('auth.login')}
      </h2>

      {error && (
        <div className="alert alert-error alert-soft text-sm">
          <span>{error}</span>
        </div>
      )}

      {isRegistering && (
        <label className="floating-label">
          <span>{t('auth.displayName')}</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required={isRegistering}
            placeholder={t('auth.displayName')}
            className="input input-bordered w-full"
          />
        </label>
      )}

      <label className="floating-label">
        <span>{t('auth.email')}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder={t('auth.email')}
          className="input input-bordered w-full"
        />
      </label>

      <label className="floating-label">
        <span>{t('auth.password')}</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder={t('auth.password')}
          className="input input-bordered w-full"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary w-full"
      >
        {isRegistering ? t('auth.register') : t('auth.login')}
      </button>

      <button
        type="button"
        onClick={handleGoogle}
        className="btn btn-outline btn-error w-full"
      >
        {t('auth.loginWithGoogle')}
      </button>

      <button
        type="button"
        onClick={() => setIsRegistering((prev) => !prev)}
        className="btn btn-link w-full"
      >
        {isRegistering ? t('auth.login') : t('auth.register')}
      </button>
    </form>
  )
}
