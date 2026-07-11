import { AuthForm } from '../components/AuthForm.tsx'

export function LoginPage() {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md">
        <AuthForm />
      </div>
    </div>
  )
}
