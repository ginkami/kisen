import { useParams } from 'react-router-dom'
import { TournamentEditForm } from '../components/tournament/TournamentEditForm.tsx'

export function TournamentEditPage() {
  const { id } = useParams<{ id: string }>()

  return <TournamentEditForm tournamentId={id} />
}
