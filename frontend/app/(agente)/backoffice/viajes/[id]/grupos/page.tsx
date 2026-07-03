'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { fetchApi } from '@/lib/api'

interface Grupo { id: string; nombre: string; alumnos: any[] }

export default function GruposPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: viajeId } = use(params)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [nuevoGrupo, setNuevoGrupo] = useState('')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    fetchApi(`/api/v1/viajes/${viajeId}/grupos/`)
      .then(data => setGrupos(Array.isArray(data) ? data : data?.results ?? []))
      .catch(console.error)
  }, [viajeId])

  async function crearGrupo() {
    if (!nuevoGrupo.trim()) return
    setCreando(true)
    try {
      const g = await fetchApi(`/api/v1/viajes/${viajeId}/grupos/`, {
        method: 'POST',
        body: JSON.stringify({ nombre: nuevoGrupo })
      })
      setGrupos(prev => [...prev, { ...g, alumnos: [] }])
      setNuevoGrupo('')
    } catch (e) {
      console.error(e)
    }
    setCreando(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href={`/backoffice/viajes/${viajeId}`} className="hover:underline">Viaje</Link>
        <span>\u203a</span><span>Grupos</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestion de grupos</h1>
      <div className="flex gap-2 mb-6">
        <input value={nuevoGrupo} onChange={e => setNuevoGrupo(e.target.value)} placeholder="Nombre del grupo (ej: Grupo A)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs" onKeyDown={e => e.key === 'Enter' && crearGrupo()} />
        <button onClick={crearGrupo} disabled={creando} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">+ Crear grupo</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {grupos.map(grupo => (
          <div key={grupo.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{grupo.nombre}</h3>
            <p className="text-xs text-gray-500 mb-3">{grupo.alumnos?.length ?? 0} alumnos</p>
            {grupo.alumnos?.length > 0 && (
              <ul className="space-y-1 mb-3">
                {grupo.alumnos.map((a: any) => (
                  <li key={a.id} className="text-xs text-gray-600">{a.nombre} {a.apellidos}</li>
                ))}
              </ul>
            )}
            <button className="text-xs text-blue-600 hover:underline">+ Asignar alumno</button>
          </div>
        ))}
        {grupos.length === 0 && <p className="text-gray-400 text-sm col-span-3">No hay grupos aun.</p>}
      </div>
    </div>
  )
}
