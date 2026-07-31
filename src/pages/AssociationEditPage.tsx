import { useParams } from 'react-router-dom'
import { AssociationEditForm } from '../components/association/AssociationEditForm.tsx'

export function AssociationEditPage() {
  const { id } = useParams<{ id: string }>()

  return <AssociationEditForm key={id ?? 'new'} associationId={id ?? 'new'} />
}