'use client'
import { useState } from 'react'
import { ChevronDown, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { fetchApi } from '@/lib/api'

interface PlantillaResumen {
  id: string
  nombre: string
  destinos: string
  dias_totales: number | null
  cant_etapas: number
}

interface SelectorPlantillaProps {
  viajeId: string
  plantillas: PlantillaResumen[]
  itinerarioTieneEtapas: boolean
  tieneInscripciones: boolean
  onAplicada: (nuevasEtapas: any[]) => void
}

export function SelectorPlantilla({
  viajeId,
  plantillas,
  itinerarioTieneEtapas,
  tieneInscripciones,
  onAplicada
}: SelectorPlantillaProps) {
  const [abierto, setAbierto] = useState(false)
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  const opciones = plantillas

  if (opciones.length === 0) {
    return (
      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Aplicar plantilla de itinerario
        </label>
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-400">
          No hay plantillas disponibles para tu agencia.
          <a href="/backoffice/plantillas" className="text-blue-600 underline ml-1">
            Crear plantilla
          </a>
        </div>
      </div>
    )
  }

  function handleSeleccionar(id: string) {
    setPlantillaSeleccionada(id)
    setAbierto(false)
    setConfirmar(true)
    setError(null)
  }

  async function handleConfirmarAplicar() {
    if (!plantillaSeleccionada) return
    setAplicando(true)
    setError(null)
    try {
      const res = await fetchApi(`/api/v1/viajes/${viajeId}/aplicar-plantilla/`, {
        method: 'POST',
        body: JSON.stringify({ plantilla_id: plantillaSeleccionada })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || data.plantilla_id?.[0] || 'Error al aplicar plantilla')
      }
      const data = await res.json()
      onAplicada(data.itinerario.etapas)
      setExito(true)
      setConfirmar(false)
      setPlantillaSeleccionada(null)
      setTimeout(() => setExito(false), 4000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAplicando(false)
    }
  }

  return (
    <div className="mt-4">
      <label className="block text-xs font-medium text-gray-500 mb-1">
        Aplicar plantilla de itinerario
      </label>

      <div className="relative">
        <button
          type="button"
          className={`w-full px-4 py-2.5 border rounded-lg text-left transition-colors ${
            aplicando
              ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-white border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
          }`}
          onClick={() => !aplicando && setAbierto(!abierto)}
          disabled={aplicando}
          aria-haspopup="listbox"
          aria-expanded={abierto}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {plantillaSeleccionada ? (
                <> 
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {opciones.find(p => p.id === plantillaSeleccionada)?.nombre}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {opciones.find(p => p.id === plantillaSeleccionada)?.cant_etapas} días
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Seleccionar plantilla…</p>
              )}
            </div>
            <ChevronDown className={`text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`} size={18} />
          </div>
        </button>

        {abierto && !aplicando && (
          <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg ring-1 ring-black/5">
            {opciones.map(p => (
              <button
                key={p.id}
                type="button"
                className="w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors"
                onClick={() => handleSeleccionar(p.id)}
              >
                <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                <p className="text-xs text-gray-500 truncate">{p.destinos || 'Sin destinos'} · {p.cant_etapas} días</p>
              </button>
            ))}
          </div>
        )}

        {/* Modal confirmación */}
        {confirmar && plantillaSeleccionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
              <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
                ¿Aplicar plantilla seleccionada?
              </h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                Se reemplazará el itinerario actual de este viaje.
                Las etapas y actividades existentes se perderán.
              </p>
              {tieneInscripciones && (
                <p className="text-sm text-gray-600 text-center mb-4 text-amber-700 bg-amber-50 p-3 rounded-lg">
                  Las inscripciones activas seguirán vigentes y verán el nuevo itinerario.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmar(false); setPlantillaSeleccionada(null); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarAplicar}
                  disabled={aplicando}
                  className="flex-1 bg-blue-800 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {aplicando ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Aplicar plantilla'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast error */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 mt-0.5" size={20} />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Toast éxito */}
        {exito && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle2 className="text-green-600 mt-0.5" size={20} />
            <div className="text-sm text-green-800">Plantilla aplicada correctamente. Itinerario actualizado.</div>
          </div>
        )}
      </div>
    </div>
  )
}