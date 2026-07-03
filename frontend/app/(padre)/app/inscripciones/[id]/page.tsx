import { LayoutViajePadre } from '@/components/padre/LayoutViajePadre'
import { cookies } from 'next/headers'

async function getInscripcion(id: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}

  try {
    const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/${id}/`, {
      cache: 'no-store',
      headers
    })
    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error('Error fetching inscripcion:', error)
    return null
  }
}

async function getItinerario(id: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}

  try {
    const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/${id}/itinerario/`, {
      cache: 'no-store',
      headers
    })
    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error('Error fetching itinerario:', error)
    return null
  }
}

const TIPO_ICONO: Record<string, string> = {
  vuelo: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  hotel: 'M3 12V7a1 1 0 011-1h16a1 1 0 011 1v5M3 12h18M3 12v4a1 1 0 001 1h16a1 1 0 001-1v-4M7 8v4',
  comida: 'M11 2v6a3 3 0 003 3v11m-3-14V2m0 6v13M18 2v6m0 0v13',
  excursion: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
}

export default async function ItinerarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [inscripcion, itinerario] = await Promise.all([
    getInscripcion(id),
    getItinerario(id),
  ])

  if (!inscripcion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">No se pudo cargar la inscripcion.</p>
      </div>
    )
  }

  return (
    <LayoutViajePadre
      inscripcionId={id}
      nombreViaje={inscripcion.viaje.nombre}
      destino={inscripcion.viaje.destino}
      estadoBadge={inscripcion.estado === 'confirmado' ? 'confirmado' : 'pre_inscrito'}
      nombreAlumno={`${inscripcion.alumno.nombre} ${inscripcion.alumno.apellidos}`}
      imagenUrl={inscripcion.viaje.imagen_url ?? undefined}
    >
      {/* Resumen del viaje */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400 text-xs block mb-0.5">Fechas</span>
            <span className="font-semibold text-gray-900">
              {inscripcion.viaje.fecha_salida} al {inscripcion.viaje.fecha_regreso}
            </span>
          </div>
          <div>
            <span className="text-gray-400 text-xs block mb-0.5">Colegio</span>
            <span className="font-semibold text-gray-900">{inscripcion.colegio || '-'}</span>
          </div>
          <div>
            <span className="text-gray-400 text-xs block mb-0.5">Grado</span>
            <span className="font-semibold text-gray-900">
              {inscripcion.grado} {inscripcion.nivel_educativo}
            </span>
          </div>
          <div>
            <span className="text-gray-400 text-xs block mb-0.5">Precio total</span>
            <span className="font-semibold text-gray-900">S/ {inscripcion.precio_final}</span>
          </div>
          <div>
            <span className="text-gray-400 text-xs block mb-0.5">Pagado</span>
            <span className="font-semibold text-gray-900">{inscripcion.porcentaje_pagado}%</span>
          </div>
          <div>
            <span className="text-gray-400 text-xs block mb-0.5">Destino</span>
            <span className="font-semibold text-gray-900">{inscripcion.viaje.destino}</span>
          </div>
        </div>
      </div>

      {/* Itinerario dia por dia */}
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
        Itinerario
      </h2>

      {!itinerario || !itinerario.etapas?.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-400 text-sm">El itinerario todavia no esta disponible.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {itinerario.etapas.map((etapa: any) => (
            <div key={etapa.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full shrink-0">
                  Dia {etapa.dia_numero}
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{etapa.titulo}</h3>
                  {etapa.descripcion && (
                    <p className="text-gray-500 text-xs mt-0.5">{etapa.descripcion}</p>
                  )}
                </div>
              </div>

              {etapa.actividades?.length > 0 && (
                <ul className="space-y-2 pl-1">
                  {etapa.actividades
                    .sort((a: any, b: any) => a.orden - b.orden)
                    .map((act: any) => (
                      <li key={act.id} className="flex items-center gap-2.5 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TIPO_ICONO[act.tipo] ?? TIPO_ICONO.excursion} />
                        </svg>
                        <span>{act.titulo}</span>
                        {act.hora && <span className="text-gray-400 text-xs ml-auto">{act.hora}</span>}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </LayoutViajePadre>
  )
}
