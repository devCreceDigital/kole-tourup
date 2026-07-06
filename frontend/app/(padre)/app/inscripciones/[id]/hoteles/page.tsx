'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchApi } from '@/lib/api'
import { LayoutViajePadre } from '@/components/padre/LayoutViajePadre'

interface Hotel {
  id: string
  nombre: string
  descripcion: string
  tasa_turistica: string
  fianza: string
  web_url: string
  maps_url: string
  imagen: string | null
  telefono?: string
  latitud?: string | number | null
  longitud?: string | number | null
}

interface Preferencia {
  tipo_habitacion: string
  tipo_cama: string
  planta: string
  necesidades_especiales: string
  estado: string
}

interface Roommate {
  id: string
  alumno: { id: string; nombre: string; apellidos: string }
  estado: string
}

interface HotelData {
  hotel: Hotel
  preferencia: Preferencia | null
  roommates: Roommate[]
}

interface AlumnoSugerido {
  id: string
  nombre: string
  apellidos: string
}

const TIPO_HABITACION_OPCIONES = [
  { value: 'doble', label: 'Doble' },
  { value: 'triple', label: 'Triple (mas economico)' },
  { value: 'cuadruple', label: 'Cuadruple' },
  { value: 'sin_preferencia', label: 'Sin preferencia' },
]

const TIPO_CAMA_OPCIONES = [
  { value: 'individuales', label: 'Camas individuales separadas' },
  { value: 'compartida', label: 'Cama doble compartida' },
  { value: 'sin_preferencia', label: 'Sin preferencia' },
]

const PLANTA_OPCIONES = [
  { value: 'baja', label: 'Planta baja' },
  { value: 'alta', label: 'Planta alta' },
  { value: 'sin_preferencia', label: 'Sin preferencia' },
]

export default function HotelesPage() {
  const params = useParams()
  const inscripcionId = params.id as string

  const [inscripcion, setInscripcion] = useState<any>(null)
  const [hoteles, setHoteles] = useState<HotelData[]>([])
  const [cargando, setCargando] = useState(true)
  const [hotelActivoIdx, setHotelActivoIdx] = useState(0)

  const [tipoHabitacion, setTipoHabitacion] = useState('sin_preferencia')
  const [tipoCama, setTipoCama] = useState('sin_preferencia')
  const [planta, setPlanta] = useState('sin_preferencia')
  const [necesidades, setNecesidades] = useState('')

  const [sugeridos, setSugeridos] = useState<AlumnoSugerido[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [roommateSeleccionado, setRoommateSeleccionado] = useState<string | null>(null)
  const [mostrarRoommates, setMostrarRoommates] = useState(false)
  const [fotoIdxPorHotel, setFotoIdxPorHotel] = useState<Record<string, number>>({})
  const [guardando, setGuardando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function cargarHoteles() {
    setCargando(true)
    try {
      const data = await fetchApi(`/api/v1/inscripciones/${inscripcionId}/hoteles/`)
      setHoteles(data)
    } catch (e) {
      console.error('Error cargando hoteles', e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarHoteles()
    fetchApi(`/api/v1/inscripciones/${inscripcionId}/`).then(setInscripcion).catch(() => {})
  }, [inscripcionId])

  const hotelData = hoteles[hotelActivoIdx]

  useEffect(() => {
    if (hotelData?.preferencia) {
      setTipoHabitacion(hotelData.preferencia.tipo_habitacion || 'sin_preferencia')
      setTipoCama(hotelData.preferencia.tipo_cama || 'sin_preferencia')
      setPlanta(hotelData.preferencia.planta || 'sin_preferencia')
      setNecesidades(hotelData.preferencia.necesidades_especiales || '')
    } else {
      setTipoHabitacion('sin_preferencia')
      setTipoCama('sin_preferencia')
      setPlanta('sin_preferencia')
      setNecesidades('')
    }
  }, [hotelActivoIdx, hoteles])

  useEffect(() => {
    if (!hotelData) return
    fetchApi(`/api/v1/inscripciones/${inscripcionId}/hoteles/${hotelData.hotel.id}/roommates/`)
      .then(setSugeridos)
      .catch(() => setSugeridos([]))
  }, [hotelActivoIdx, hoteles])

  async function guardarPreferencia() {
    if (!hotelData) return
    setGuardando(true)
    setMensaje(null)
    try {
      await fetchApi(`/api/v1/inscripciones/${inscripcionId}/hoteles/${hotelData.hotel.id}/preferencia/`, {
        method: 'POST',
        body: JSON.stringify({
          tipo_habitacion: tipoHabitacion,
          tipo_cama: tipoCama,
          planta: planta,
          necesidades_especiales: necesidades,
        }),
      })
      await cargarHoteles()
      setMostrarModal(true)
    } catch (e) {
      setMensaje('No se pudo guardar la preferencia. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function solicitarRoommate(alumnoId: string) {
    if (!hotelData) return
    try {
      await fetchApi(`/api/v1/inscripciones/${inscripcionId}/hoteles/${hotelData.hotel.id}/roommates/`, {
        method: 'POST',
        body: JSON.stringify({ alumno_id: alumnoId }),
      })
      await cargarHoteles()
    } catch (e) {
      setMensaje('No se pudo enviar la solicitud.')
    }
  }

  if (cargando || !inscripcion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  const layoutProps = {
    inscripcionId,
    nombreViaje: inscripcion.viaje.nombre,
    destino: inscripcion.viaje.destino,
    estadoBadge: (inscripcion.estado === 'confirmado' ? 'confirmado' : 'pre_inscrito') as 'confirmado' | 'pre_inscrito',
    nombreAlumno: `${inscripcion.alumno.nombre} ${inscripcion.alumno.apellidos}`,
    imagenUrl: inscripcion.viaje.imagen_url ?? undefined,
  }

  if (hoteles.length === 0) {
    return (
      <LayoutViajePadre {...layoutProps}>
        <div className="max-w-3xl mx-auto px-4 py-10 text-center text-gray-500">
          Aun no hay hoteles disponibles para este viaje.
        </div>
      </LayoutViajePadre>
    )
  }

  const sugeridosFiltrados = sugeridos.filter(a =>
    `${a.nombre} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <LayoutViajePadre {...layoutProps}>
    <style jsx global>{`
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12V7a1 1 0 011-1h16a1 1 0 011 1v5M3 12h18M3 12v4a1 1 0 001 1h16a1 1 0 001-1v-4M7 8v4" />
          </svg>
          <h2 className="font-bold text-gray-900 text-sm">Alojamiento previsto</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">{hoteles.length} hoteles</p>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {hoteles.map((h, idx) => (
            <div
              key={h.hotel.id}
              onClick={() => setHotelActivoIdx(idx)}
              role="button"
              tabIndex={0}
              className={`flex-shrink-0 text-left border rounded-xl overflow-hidden w-56 transition-colors cursor-pointer ${
                idx === hotelActivoIdx ? 'border-primary ring-1 ring-primary' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="relative h-28 bg-gradient-to-br from-primary to-primary/70 overflow-hidden">
                <div
                  className="absolute inset-0 flex transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${(fotoIdxPorHotel[h.hotel.id] ?? 0) * 100}%)` }}
                >
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-full h-full flex-shrink-0 bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
                      </svg>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    setFotoIdxPorHotel(prev => ({ ...prev, [h.hotel.id]: ((prev[h.hotel.id] ?? 0) + 2) % 3 }))
                  }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    setFotoIdxPorHotel(prev => ({ ...prev, [h.hotel.id]: ((prev[h.hotel.id] ?? 0) + 1) % 3 }))
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {h.preferencia && (
                  <span className="absolute top-2 right-2 text-[10px] font-semibold text-green-700 bg-white px-2 py-0.5 rounded-full shadow-sm z-10">
                    Preferencia guardada
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-gray-900 truncate">{h.hotel.nombre}</p>
                <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{h.hotel.descripcion}</p>
                <div className="mt-2 space-y-0.5 text-[11px] text-gray-500">
                  <p>Tasa turistica: S/ {h.hotel.tasa_turistica}</p>
                  <p>Fianza: S/ {h.hotel.fianza}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {hotelData && (
        <div key={hotelData.hotel.id} className="space-y-5 animate-[fadeSlideIn_0.25s_ease-out]">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-3">{hotelData.hotel.nombre}</h3>
            <p className="text-sm text-gray-500 mb-4">{hotelData.hotel.descripcion}</p>

            {hotelData.hotel.telefono && (
              <a
                href={`tel:${hotelData.hotel.telefono}`}
                className="flex items-center gap-2 text-sm text-gray-700 font-medium mb-3"
              >
                <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {hotelData.hotel.telefono}
              </a>
            )}

            {hotelData.hotel.latitud && hotelData.hotel.longitud && (
              <div className="rounded-lg overflow-hidden mb-3 border border-gray-100">
                <iframe
                  title={`Mapa ${hotelData.hotel.nombre}`}
                  width="100%"
                  height="180"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${hotelData.hotel.latitud},${hotelData.hotel.longitud}&z=15&output=embed`}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3 text-xs">
              {hotelData.hotel.web_url && (
                <a href={hotelData.hotel.web_url} target="_blank" className="text-primary font-semibold hover:underline">Web oficial</a>
              )}
              {hotelData.hotel.maps_url && (
                <a href={hotelData.hotel.maps_url} target="_blank" className="text-primary font-semibold hover:underline">Abrir en Google Maps</a>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Preferencias de habitacion</h3>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">1. Tipo de habitacion preferida</p>
              <div className="flex flex-wrap gap-2">
                {TIPO_HABITACION_OPCIONES.map(op => (
                  <button
                    key={op.value}
                    onClick={() => setTipoHabitacion(op.value)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                      tipoHabitacion === op.value
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setMostrarRoommates(!mostrarRoommates)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 p-3.5 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span>2. Con quien quiere compartir habitacion</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${mostrarRoommates ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mostrarRoommates && (
              <div className="p-4 border-t border-gray-100">
              <input
                type="text"
                placeholder="Buscar por nombre del companero..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-primary"
              />
              {sugeridosFiltrados.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Sugeridos</p>
                  <div className="space-y-2">
                    {sugeridosFiltrados.map(al => {
                      const yaSolicitado = hotelData.roommates.find(r => r.alumno.id === al.id)
                      return (
                        <label key={al.id} className="flex items-center justify-between cursor-pointer">
                          <span className="text-sm text-gray-700">{al.nombre} {al.apellidos}</span>
                          {yaSolicitado ? (
                            <span className="text-[11px] font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                              {yaSolicitado.estado === 'pendiente' ? 'Pendiente que acepte' : yaSolicitado.estado}
                            </span>
                          ) : (
                            <input
                              type="radio"
                              name="roommate"
                              checked={roommateSeleccionado === al.id}
                              onChange={() => setRoommateSeleccionado(al.id)}
                            />
                          )}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              {sugeridosFiltrados.length === 0 && (
                <p className="text-xs text-gray-400">No hay companeros disponibles.</p>
              )}
              {roommateSeleccionado && (
                <button
                  onClick={() => solicitarRoommate(roommateSeleccionado)}
                  className="mt-2 w-full bg-primary text-white rounded-lg py-2 text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  Guardar companero
                </button>
              )}
              </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Tipo de cama</p>
                <div className="space-y-1">
                  {TIPO_CAMA_OPCIONES.map(op => (
                    <label key={op.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={tipoCama === op.value}
                        onChange={() => setTipoCama(op.value)}
                      />
                      {op.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Planta del hotel</p>
                <div className="space-y-1">
                  {PLANTA_OPCIONES.map(op => (
                    <label key={op.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={planta === op.value}
                        onChange={() => setPlanta(op.value)}
                      />
                      {op.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 mb-2">Necesidades especiales (opcional)</p>
              <textarea
                value={necesidades}
                onChange={e => setNecesidades(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="Ej. Habitacion adaptada, cerca del ascensor..."
              />
            </div>

            {mensaje && <p className="text-xs text-red-600 mb-3">{mensaje}</p>}

            <button
              onClick={guardarPreferencia}
              disabled={guardando}
              className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar preferencias'}
            </button>
          </div>
        </div>
      )}

      {mostrarModal && hotelData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-3">Confirma tu seleccion de habitacion</h3>
            <div className="text-sm text-gray-600 space-y-1 mb-4">
              <p><span className="font-semibold">{hotelData.hotel.nombre}</span></p>
              <p>Habitacion: {TIPO_HABITACION_OPCIONES.find(o => o.value === tipoHabitacion)?.label}</p>
              <p>Tasa turistica: {hotelData.hotel.tasa_turistica}</p>
            </div>
            <p className="text-xs text-gray-400 mb-4">La agencia confirmara la asignacion final.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMostrarModal(false)}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Modificar
              </button>
              <button
                onClick={() => setMostrarModal(false)}
                className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-semibold hover:bg-primary/90"
              >
                Confirmar seleccion
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </LayoutViajePadre>
  )
}
