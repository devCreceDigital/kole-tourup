'use client'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ActividadCard } from './ActividadCard'

interface Actividad {
  id: string
  titulo: string
  hora?: string
  descripcion?: string
  orden: number
}

interface EtapaDiaProps {
  etapa: { id: string; dia_numero: number; titulo: string; descripcion?: string }
  actividades: Actividad[]
  seleccionada: boolean
  onSeleccionar: () => void
  onEliminarActividad: (id: string) => void
  onAgregarActividad: () => void
}

export function EtapaDia({ etapa, actividades, seleccionada, onSeleccionar, onEliminarActividad, onAgregarActividad }: EtapaDiaProps) {
  return (
    <div className={`border rounded-xl overflow-hidden ${seleccionada ? 'border-blue-500' : 'border-gray-200'}`}>
      <button onClick={onSeleccionar} className={`w-full text-left px-4 py-3 font-semibold text-sm ${seleccionada ? 'bg-blue-800 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
        Dia {etapa.dia_numero}: {etapa.titulo}
      </button>
      {seleccionada && (
        <div className="p-4 space-y-2">
          <SortableContext items={actividades.map(a => a.id)} strategy={verticalListSortingStrategy}>
            {actividades.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Sin actividades aun</p>
            )}
            {actividades.map(act => (
              <ActividadCard key={act.id} actividad={act} onEliminar={onEliminarActividad} />
            ))}
          </SortableContext>
          <button onClick={onAgregarActividad} className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
            + Agregar actividad
          </button>
        </div>
      )}
    </div>
  )
}