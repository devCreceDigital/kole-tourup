'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'

const PROVINCIAS = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza',
  'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao',
  'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Otro'
]

function formatDateRange(salida: string, regreso?: string) {
  const s = new Date(salida)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  if (regreso) {
    const r = new Date(regreso)
    return `${s.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}–${r.toLocaleDateString('es-ES', opts)}`
  }
  return s.toLocaleDateString('es-ES', opts)
}

export default function BuscarViajePage() {
  const router = useRouter()

  // Form state
  const [codigo, setCodigo] = useState('')
  const [provincia, setProvincia] = useState('')
  const [colegio, setColegio] = useState('')
  const [destino, setDestino] = useState('')
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)

  // Data
  const [viajes, setViajes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Vista de resultados
  const [showResults, setShowResults] = useState(false)
  const [resultados, setResultados] = useState<any[]>([])
  const [colegioLabel, setColegioLabel] = useState('')

  useEffect(() => {
    async function loadViajes() {
      try {
        const data = await fetchApi('/api/v1/viajes/publico/')
        setViajes(data?.results ?? (Array.isArray(data) ? data : []))
      } catch (err) {
        console.error('Error fetching viajes:', err)
      } finally {
        setLoading(false)
      }
    }
    loadViajes()
  }, [])

  const colegiosUnicos = Array.from(new Set(viajes.map(v => v.colegio?.trim()).filter(Boolean)))

  const destinosFiltrados = viajes
    .filter(v => !colegio || v.colegio?.trim() === colegio.trim())
    .map(v => v.destino)
  const destinosUnicos = Array.from(new Set(destinosFiltrados))

  useEffect(() => {
    if (destinosUnicos.length === 1 && destino !== destinosUnicos[0]) {
      setDestino(destinosUnicos[0])
    } else if (destinosUnicos.length === 0) {
      setDestino('')
    }
  }, [colegio])

  // Buscar por código
  const handleBuscarCodigo = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBusqueda(null)
    if (!codigo.trim()) return

    const viaje = viajes.find(v => v.codigo?.toUpperCase() === codigo.trim().toUpperCase())
    if (viaje) {
      router.push(`/app/validacion/${viaje.id}?codigo=${codigo.trim()}`)
    } else {
      setErrorBusqueda('Código de viaje no encontrado.')
    }
  }

  // Buscar por colegio + destino → mostrar resultados
  const handleSiguiente = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBusqueda(null)
    if (!colegio) {
      setErrorBusqueda('Selecciona un colegio.')
      return
    }

    const matches = viajes.filter(v =>
      v.colegio?.trim() === colegio.trim() &&
      (!destino || v.destino === destino)
    )

    if (matches.length === 0) {
      setErrorBusqueda('No se encontraron viajes con esa combinación.')
      return
    }

    setResultados(matches)
    setColegioLabel(`${colegio}${provincia ? ' — ' + provincia : ''}`)
    setShowResults(true)
  }

  // ── Vista de RESULTADOS ──
  if (showResults) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back */}
          <button
            onClick={() => setShowResults(false)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Cambiar búsqueda
          </button>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Viajes disponibles para <span className="text-[#0077B6]">{colegioLabel}</span>
          </h1>

          <div className="space-y-4">
            {resultados.map((viaje) => {
              const plazasOk = viaje.plazas_disponibles > 0
              return (
                <div
                  key={viaje.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex"
                >
                  {/* Imagen */}
                  <div className="w-32 h-28 flex-shrink-0 bg-gray-100 relative overflow-hidden">
                    {viaje.imagen_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={viaje.imagen_url} alt={viaje.destino} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 px-4 py-3 flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">
                        {viaje.nombre}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        {viaje.fecha_salida && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDateRange(viaje.fecha_salida, viaje.fecha_regreso)}
                          </span>
                        )}
                        {viaje.nivel_educativo && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
                            </svg>
                            {[viaje.grado, viaje.nivel_educativo].filter(Boolean).join(' ')}
                          </span>
                        )}
                        {viaje.precio_base && (
                          <span className="font-semibold text-gray-700">
                            Desde {Number(viaje.precio_base).toLocaleString('es-ES')}€
                          </span>
                        )}
                      </div>
                      {/* Badge disponibilidad */}
                      <div>
                        {plazasOk ? (
                          <span className="inline-block text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                            Plazas disponibles
                          </span>
                        ) : (
                          <span className="inline-block text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            Lista de espera
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botón acción */}
                    <div className="flex-shrink-0 flex items-center self-center">
                      <button
                        onClick={() => router.push(`/app/validacion/${viaje.id}?colegio=${encodeURIComponent(colegio)}&nivel=${encodeURIComponent(viaje.nivel_educativo || '')}&grado=${encodeURIComponent(viaje.grado || '')}`)}
                        className="flex items-center gap-1 text-sm font-semibold text-white bg-[#0077B6] rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        {plazasOk ? 'Inscribir' : 'Apuntarse'}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Vista de FORMULARIO DE BÚSQUEDA ──
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Card principal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-7">
          <h1 className="text-2xl font-bold text-[#0A2540] text-center mb-7">
            Encuentra el viaje de tu hijo/a
          </h1>

          {/* Búsqueda rápida por código */}
          <form onSubmit={handleBuscarCodigo} className="mb-1">
            <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
              Búsqueda rápida
            </label>
            <div className="flex">
              <input
                type="text"
                placeholder="Tengo un código de viaje"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 text-sm"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0077B6] text-white font-semibold text-sm rounded-r-lg hover:bg-blue-700 transition-colors"
              >
                Buscar
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="relative py-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">o busca por tu centro educativo</span>
            </div>
          </div>

          {/* Búsqueda por colegio */}
          <form onSubmit={handleSiguiente} className="space-y-4">

            {/* Fila: Provincia + Colegio */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                  Provincia<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={provincia}
                    onChange={e => setProvincia(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="">Provincia</option>
                    {PROVINCIAS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                  Nombre del colegio<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="lista-colegios"
                    placeholder="IES Ibn Jaldún..."
                    value={colegio}
                    onChange={(e) => setColegio(e.target.value)}
                    className="w-full pr-8 pl-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <datalist id="lista-colegios">
                    {colegiosUnicos.map((col, idx) => (
                      <option key={idx} value={col as string} />
                    ))}
                  </datalist>
                  <div className="absolute inset-y-0 right-2.5 flex items-center text-gray-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Destino del viaje */}
            <div>
              <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                Destino del viaje<span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={destino}
                  onChange={(e) => setDestino(e.target.value)}
                  disabled={!colegio || destinosUnicos.length === 0}
                  className="w-full appearance-none px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-gray-50"
                >
                  <option value="">
                    {colegio
                      ? (destinosUnicos.length > 0 ? 'Barcelona, Pirineos & Port Aventura' : 'No hay viajes para este colegio')
                      : 'Primero selecciona un colegio'}
                  </option>
                  {destinosUnicos.map((dest, idx) => (
                    <option key={idx} value={dest as string}>{dest as string}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {errorBusqueda && (
              <p className="text-red-600 text-sm font-medium text-center">{errorBusqueda}</p>
            )}

            <button
              type="submit"
              disabled={loading || !colegio}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#0077B6] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              Siguiente
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>

        {/* Card "¿No encuentras tu viaje?" */}
        <div className="bg-[#FEF9E7] rounded-xl p-5 border border-[#FBE9B6] text-center">
          <p className="text-sm font-semibold text-[#8B6C1D] mb-3 flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            ¿No encuentras el viaje?
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <button className="flex items-center gap-1.5 text-[#8B6C1D] hover:text-[#6A5215] font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Contactar soporte
            </button>
            <button className="flex items-center gap-1.5 text-[#8B6C1D] hover:text-[#6A5215] font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Unirme con código
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
