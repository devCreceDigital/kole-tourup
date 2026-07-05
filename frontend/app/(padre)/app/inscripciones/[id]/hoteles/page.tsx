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
      headers,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function getHoteles(id: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}

  try {
    const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/${id}/hoteles/`, {
      cache: 'no-store',
      headers,
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

export default async function HotelesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [inscripcion, hoteles] = await Promise.all([
    getInscripcion(id),
    getHoteles(id),
  ])

  if (!inscripcion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">No se pudo cargar la inscripcion.</p>
      </div>
    )
  }

  const listaHoteles: any[] = Array.isArray(hoteles) ? hoteles : (hoteles?.results ?? [])

  return (
    <LayoutViajePadre
      inscripcionId={id}
      nombreViaje={inscripcion.viaje.nombre}
      destino={inscripcion.viaje.destino}
      estadoBadge={inscripcion.estado === 'confirmado' ? 'confirmado' : 'pre_inscrito'}
      nombreAlumno={`${inscripcion.alumno.nombre} ${inscripcion.alumno.apellidos}`}
      imagenUrl={inscripcion.viaje.imagen_url ?? undefined}
    >
      <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
        Alojamiento
      </h2>

      {listaHoteles.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
          <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12V7a1 1 0 011-1h16a1 1 0 011 1v5M3 12h18M3 12v4a1 1 0 001 1h16a1 1 0 001-1v-4M7 8v4" />
          </svg>
          <p className="text-gray-400 text-sm font-medium">No hay hoteles registrados</p>
          <p className="text-gray-300 text-xs mt-1">La información de alojamiento se publicará próximamente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {listaHoteles.map((hotel: any) => (
            <div
              key={hotel.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
            >
              {/* Imagen del hotel */}
              {hotel.imagen_url && (
                <div className="h-40 overflow-hidden">
                  <img
                    src={hotel.imagen_url}
                    alt={hotel.nombre}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-5">
                {/* Nombre */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/10 rounded-full p-1.5 shrink-0">
                      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12V7a1 1 0 011-1h16a1 1 0 011 1v5M3 12h18M3 12v4a1 1 0 001 1h16a1 1 0 001-1v-4M7 8v4" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">{hotel.nombre}</h3>
                  </div>
                </div>

                {/* Descripción */}
                {hotel.descripcion && (
                  <p className="text-gray-500 text-xs leading-relaxed mb-3">{hotel.descripcion}</p>
                )}

                {/* Detalles económicos */}
                {(hotel.tasa_turistica || hotel.fianza) && (
                  <div className="flex gap-4 text-xs mb-3">
                    {hotel.tasa_turistica && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-400 block mb-0.5">Tasa turística</span>
                        <span className="font-semibold text-gray-700">S/ {parseFloat(hotel.tasa_turistica).toFixed(2)} / noche</span>
                      </div>
                    )}
                    {hotel.fianza && (
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-400 block mb-0.5">Fianza</span>
                        <span className="font-semibold text-gray-700">S/ {parseFloat(hotel.fianza).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Links externos */}
                <div className="flex gap-2 flex-wrap">
                  {hotel.web_url && (
                    <a
                      href={hotel.web_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Ver hotel
                    </a>
                  )}
                  {hotel.maps_url && (
                    <a
                      href={hotel.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Ver en mapa
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </LayoutViajePadre>
  )
}
