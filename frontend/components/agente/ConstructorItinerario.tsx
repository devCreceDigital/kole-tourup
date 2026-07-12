'use client'
import { useState } from 'react'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { EtapaDia } from './EtapaDia'

interface Actividad {
  id: string
  titulo: string
  hora?: string
  descripcion?: string
  orden: number
}

interface Etapa {
  id: string
  dia_numero: number
  titulo: string
  actividades: Actividad[]
}

interface ConstructorItinerarioProps {
  etapasIniciales: Etapa[]
  viajeId: string
}

export function ConstructorItinerario({ etapasIniciales, viajeId }: ConstructorItinerarioProps) {
  const [etapas, setEtapas] = useState(etapasIniciales)
  const [etapaSeleccionada, setEtapaSeleccionada] = useState<string | null>(etapasIniciales[0]?.id ?? null)
  const [guardando, setGuardando] = useState(false)
  const [nuevaActividad, setNuevaActividad] = useState('')
  const [mostrarInputEtapa, setMostrarInputEtapa] = useState(false)
  const [nuevaEtapa, setNuevaEtapa] = useState('')

  const sensors = useSensors(useSensor(PointerSensor))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const etapa = etapas.find(e => e.id === etapaSeleccionada)
    if (!etapa) return
    const oldIndex = etapa.actividades.findIndex(a => a.id === active.id)
    const newIndex = etapa.actividades.findIndex(a => a.id === over.id)
    const nuevasActividades = arrayMove(etapa.actividades, oldIndex, newIndex).map((a, i) => ({ ...a, orden: i + 1 }))
    setEtapas(prev => prev.map(e => e.id === etapaSeleccionada ? { ...e, actividades: nuevasActividades } : e))
    setGuardando(true)
    await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/etapas/${etapa.id}/actividades/reordenar/`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevasActividades.map(a => ({ id: a.id, orden: a.orden })))
    })
    setGuardando(false)
  }

  async function agregarActividad(etapaId: string) {
    if (!nuevaActividad.trim()) return
    const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/etapas/${etapaId}/actividades/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: nuevaActividad })
    })
    if (res.ok) {
      const act = await res.json()
      setEtapas(prev => prev.map(e => e.id === etapaId ? { ...e, actividades: [...e.actividades, act] } : e))
      setNuevaActividad('')
    }
  }

  async function eliminarActividad(etapaId: string, actId: string) {
    await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/etapas/${etapaId}/actividades/${actId}/`, { method: 'DELETE', credentials: 'include' })
    setEtapas(prev => prev.map(e => e.id === etapaId ? { ...e, actividades: e.actividades.filter(a => a.id !== actId) } : e))
  }

  async function agregarEtapa() {
    if (!nuevaEtapa.trim()) return
    const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/etapas/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: nuevaEtapa, dia_numero: etapas.length + 1 })
    })
    if (res.ok) {
      const etapa = await res.json()
      setEtapas(prev => [...prev, { ...etapa, actividades: [] }])
      setNuevaEtapa('')
      setMostrarInputEtapa(false)
      setEtapaSeleccionada(etapa.id)
    }
  }

  return (
    <div>
      {guardando && <p className="text-xs text-blue-600 mb-2 text-right">Guardando orden...</p>}
      <DndContext id='itinerario-dnd' sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-2">
          {etapas.map(etapa => (
            <EtapaDia
              key={etapa.id}
              etapa={etapa}
              actividades={etapa.actividades}
              seleccionada={etapaSeleccionada === etapa.id}
              onSeleccionar={() => setEtapaSeleccionada(etapa.id)}
              onEliminarActividad={(actId) => eliminarActividad(etapa.id, actId)}
              onAgregarActividad={() => {
                setEtapaSeleccionada(etapa.id)
                const titulo = prompt('Titulo de la actividad:')
                if (titulo) { setNuevaActividad(titulo); setTimeout(() => agregarActividad(etapa.id), 100) }
              }}
            />
          ))}
        </div>
      </DndContext>
      <div className="mt-4">
        {mostrarInputEtapa ? (
          <div className="flex gap-2">
            <input value={nuevaEtapa} onChange={e => setNuevaEtapa(e.target.value)} placeholder="Titulo del dia..." className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" onKeyDown={e => e.key === 'Enter' && agregarEtapa()} />
            <button onClick={agregarEtapa} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm">Agregar</button>
            <button onClick={() => setMostrarInputEtapa(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setMostrarInputEtapa(true)} className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-600 transition-colors">
            + Añadir dia
          </button>
        )}
      </div>
    </div>
  )
}