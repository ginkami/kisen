import { useParams } from 'react-router-dom'
import { EventEditForm } from '../components/event/EventEditForm.tsx'

export function EventEditPage() {
  const { id } = useParams<{ id: string }>()

  return <EventEditForm key={id ?? 'new'} eventId={id ?? 'new'} />
}