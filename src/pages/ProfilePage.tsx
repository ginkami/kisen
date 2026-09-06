import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.tsx'
import { ProfileEditForm } from '../components/profile/ProfileEditForm.tsx'

export function ProfilePage() {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isLoading || !user) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ProfileEditForm key={user.id} profile={user} />
    </div>
  )
}

