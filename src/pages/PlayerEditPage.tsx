import { useParams } from 'react-router-dom'
import { PlayerEditForm } from '../components/player/PlayerEditForm.tsx'

export function PlayerEditPage() {
  const { id } = useParams<{ id: string }>()

  return <PlayerEditForm playerId={id} />
}