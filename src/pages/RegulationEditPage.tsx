import { useParams } from 'react-router-dom'
import { RegulationEditForm } from '../components/regulation/RegulationEditForm.tsx'

export function RegulationEditPage() {
  const { id } = useParams<{ id: string }>()

  return <RegulationEditForm key={id ?? 'new'} regulationId={id ?? 'new'} />
}