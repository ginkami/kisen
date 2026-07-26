import { useLocation, useParams } from 'react-router-dom'
import { PlayerEditForm } from '../components/player/PlayerEditForm.tsx'

export function PlayerEditPage() {
  const { id } = useParams<{ id: string }>()
  const { pathname } = useLocation()
  const playerId = pathname.endsWith('/new') ? 'new' : id

  return <PlayerEditForm key={playerId} playerId={playerId} />
}
