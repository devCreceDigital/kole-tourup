'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchApi } from '@/lib/api'
import { LayoutViajePadre } from '@/components/padre/LayoutViajePadre'

function formatHora(hora: string | null) {
  if (!hora) return null
  const [horaStr, minStr] = hora.split(':')
  let h = parseInt(horaStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${minStr} ${ampm}`
}

export default function VuelosPage() {
  const params = useParams()
  const id = params.id as string

  const [inscripcion, setInscripcion] = useState<any>(null)
  const [itinerario, setItinerario] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      setCargando(true)
      try {
        const [insData, itinData] = await Promise.all([
          fetchApi(`/api/v1/inscripciones/${id}/`),
          fetchApi(`/api/v1/inscripciones/${id}/itinerario/`).catch(() => null),
        ])
        setInscripcion(insData)
        setItinerario(itinData)
      } catch (e) {
        console.error('Error cargando vuelos', e)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id])

  if (cargando) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-3">
        {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!inscripcion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">No se pudo cargar la inscripcion.</p>
      </div>
    )
  }

  const vuelos: any[] = []
  if (itinerario?.etapas) {
    for (const etapa of itinerario.etapas) {
      for (const act of etapa.actividades ?? []) {
        if (act.tipo === 'vuelo') {
          vuelos.push({ ...act, dia_numero: etapa.dia_numero, titulo_etapa: etapa.titulo })
        }
      }
    }
  }

  const layoutProps = {
    inscripcionId: id,
    nombreViaje: inscripcion.viaje.nombre,
    destino: inscripcion.viaje.destino,
    estadoBadge: (inscripcion.estado === 'confirmado' ? 'confirmado' : 'pre_inscrito') as 'confirmado' | 'pre_inscrito',
    nombreAlumno: `${inscripcion.alumno.nombre} ${inscripcion.alumno.apellidos}`,
    imagenUrl: inscripcion.viaje.imagen_url ?? undefined,
  }

  return (
    <LayoutViajePadre {...layoutProps}>
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
        Vuelos y traslados aéreos
      </h2>

      {vuelos.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
          <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
          <p className="text-gray-400 text-sm font-medium">No hay vuelos registrados</p>
          <p className="text-gray-300 text-xs mt-1">La información de vuelos y traslados se publicará próximamente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vuelos.map((vuelo) => {
            const abierto = expandido === vuelo.id
            return (
              <div key={vuelo.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandido(abierto ? null : vuelo.id)}
                  className="w-full text-left p-5 flex items-start gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="bg-primary/10 rounded-full p-2.5 shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                        Día {vuelo.dia_numero}
                      </span>
                      {vuelo.hora && (
                        <span className="text-gray-400 text-xs">{formatHora(vuelo.hora)}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">{vuelo.titulo}</h3>
                    {(vuelo.aerolinea || vuelo.numero_vuelo) && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {vuelo.aerolinea && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                            {vuelo.aerolinea}
                          </span>
                        )}
                        {vuelo.numero_vuelo && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Vuelo {vuelo.numero_vuelo}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <svg
                    className={`w-4 h-4 text-gray-400 shrink-0 mt-1 transition-transform ${abierto ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {abierto && (
                  <div className="px-5 pb-5">
                    {(vuelo.origen || vuelo.destino) && (
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <div className="flex-1">
                          <p className="text-gray-400 text-[10px] uppercase tracking-wide font-semibold">Origen</p>
                          <p className="font-bold text-gray-900">{vuelo.origen || '-'}</p>
                          {vuelo.hora && <p className="text-gray-500 text-xs">{formatHora(vuelo.hora)}</p>}
                        </div>
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <div className="flex-1 text-right">
                          <p className="text-gray-400 text-[10px] uppercase tracking-wide font-semibold">Destino</p>
                          <p className="font-bold text-gray-900">{vuelo.destino || '-'}</p>
                          {vuelo.hora_llegada && <p className="text-gray-500 text-xs">{formatHora(vuelo.hora_llegada)}</p>}
                        </div>
                      </div>
                    )}

                    {(vuelo.terminal || vuelo.puerta_embarque) && (
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        {vuelo.terminal && <span>Terminal <strong className="text-gray-700">{vuelo.terminal}</strong></span>}
                        {vuelo.puerta_embarque && <span>Puerta <strong className="text-gray-700">{vuelo.puerta_embarque}</strong></span>}
                      </div>
                    )}

                    {vuelo.descripcion && (
                      <p className="text-gray-500 text-xs mt-2 leading-relaxed">{vuelo.descripcion}</p>
                    )}
                    <p className="text-gray-300 text-xs mt-1">{vuelo.titulo_etapa}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </LayoutViajePadre>
  )
}
