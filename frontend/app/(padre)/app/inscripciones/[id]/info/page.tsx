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

function formatFecha(fechaIso: string | null) {
  if (!fechaIso) return '-'
  const [year, month, day] = fechaIso.split('-')
  return `${day}/${month}/${year}`
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 text-xs font-medium">{label}</span>
      <span className="text-gray-900 text-sm font-semibold text-right max-w-[60%]">{value || '-'}</span>
    </div>
  )
}

export default async function InfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inscripcion = await getInscripcion(id)

  if (!inscripcion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">No se pudo cargar la inscripcion.</p>
      </div>
    )
  }

  const alumno = inscripcion.alumno ?? {}
  const viaje = inscripcion.viaje ?? {}

  return (
    <LayoutViajePadre
      inscripcionId={id}
      nombreViaje={viaje.nombre}
      destino={viaje.destino}
      estadoBadge={inscripcion.estado === 'confirmado' ? 'confirmado' : 'pre_inscrito'}
      nombreAlumno={`${alumno.nombre} ${alumno.apellidos}`}
      imagenUrl={viaje.imagen_url ?? undefined}
    >
      <div className="space-y-4">
        {/* Datos del alumno */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="font-bold text-gray-900 text-sm">Datos del alumno</h2>
          </div>
          <div className="px-5">
            <InfoRow label="Nombre completo" value={`${alumno.nombre} ${alumno.apellidos}`} />
            <InfoRow label="Documento" value={alumno.numero_documento} />
            <InfoRow label="Fecha de nacimiento" value={formatFecha(alumno.fecha_nacimiento)} />
            <InfoRow label="Teléfono" value={alumno.telefono} />
            <InfoRow label="Email" value={alumno.email} />
          </div>
        </div>

        {/* Datos de la inscripción */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="font-bold text-gray-900 text-sm">Datos de la inscripción</h2>
          </div>
          <div className="px-5">
            <InfoRow label="Estado" value={inscripcion.estado} />
            <InfoRow label="Precio acordado" value={inscripcion.precio_final ? `S/ ${inscripcion.precio_final}` : null} />
            <InfoRow label="Colegio" value={inscripcion.colegio} />
            <InfoRow label="Grado" value={[inscripcion.grado, inscripcion.nivel_educativo].filter(Boolean).join(' ')} />
            <InfoRow label="Fecha de inscripción" value={formatFecha(inscripcion.fecha_inscripcion)} />
          </div>
        </div>

        {/* Datos del viaje */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="font-bold text-gray-900 text-sm">Datos del viaje</h2>
          </div>
          <div className="px-5">
            <InfoRow label="Nombre" value={viaje.nombre} />
            <InfoRow label="Destino" value={viaje.destino} />
            <InfoRow label="Salida" value={formatFecha(viaje.fecha_salida)} />
            <InfoRow label="Regreso" value={formatFecha(viaje.fecha_regreso)} />
            <InfoRow label="Cupo máximo" value={viaje.cupo_maximo} />
          </div>
        </div>

        {/* Contacto de emergencia */}
        {(alumno.telefono_emergencia || alumno.nombre_tutor_legal) && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <h2 className="font-bold text-gray-900 text-sm">Contacto de emergencia</h2>
            </div>
            <div className="px-5">
              <InfoRow label="Tutor legal" value={alumno.nombre_tutor_legal} />
              <InfoRow label="Teléfono de emergencia" value={alumno.telefono_emergencia} />
            </div>
          </div>
        )}

        {/* Notas / necesidades especiales */}
        {alumno.necesidades_especiales && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-bold text-amber-800 text-sm">Necesidades especiales / Alergias</h3>
            </div>
            <p className="text-amber-700 text-sm leading-relaxed">{alumno.necesidades_especiales}</p>
          </div>
        )}
      </div>
    </LayoutViajePadre>
  )
}
