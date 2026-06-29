'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Actividad {
  id: string
  titulo: string
  hora?: string
  descripcion?: string
  orden: number
}

interface ActividadCardProps {
  actividad: Actividad
  onEliminar: (id: string) => void
}

export function ActividadCard({ actividad, onEliminar }: ActividadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: actividad.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className={`bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-3 ${isDragging ? 'shadow-lg' : 'hover:shadow-sm'}`}>
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing mt-0.5 flex-shrink-0">
        ⠿
      </button>
      <div className="flex-1 min-w-0">
        {actividad.hora && <p className="text-xs text-blue-600 font-medium mb-0.5">{actividad.hora}</p>}
        <p className="text-sm font-medium text-gray-900">{actividad.titulo}</p>
        {actividad.descripcion && <p className="text-xs text-gray-400 mt-0.5 truncate">{actividad.descripcion}</p>}
      </div>
      <button onClick={() => onEliminar(actividad.id)} className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0">✕</button>
    </div>
  )
}