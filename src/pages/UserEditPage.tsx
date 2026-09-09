import { useParams } from 'react-router-dom'
import { UserEditForm } from '../components/user/UserEditForm.tsx'

export function UserEditPage() {
  const { id } = useParams<{ id: string }>()

  return <UserEditForm key={id ?? ''} userId={id ?? ''} />
}
