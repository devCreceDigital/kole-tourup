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

async function getItinerario(id: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}

  try {
    const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/${id}/itinerario/`, {
      cache: 'no-store',
      headers,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function formatHora(hora: string | null) {
  if (!hora) return null
  // hora viene como "HH:MM:SS", mostramos solo HH:MM
  return hora.slice(0, 5)
}

export default async function VuelosPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Extraemos todas las actividades de tipo "vuelo" del itinerario
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
          {vuelos.map((vuelo) => (
            <div
              key={vuelo.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-start gap-4"
            >
              {/* Icono */}
              <div className="bg-primary/10 rounded-full p-2.5 shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>

              {/* Info */}
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
                {vuelo.descripcion && (
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">{vuelo.descripcion}</p>
                )}
                <p className="text-gray-300 text-xs mt-1">{vuelo.titulo_etapa}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </LayoutViajePadre>
  )
}
