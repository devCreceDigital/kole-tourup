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

async function getDocumentos(id: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}

  try {
    const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/${id}/documentos/`, {
      cache: 'no-store',
      headers
    })
    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error('Error fetching documentos:', error)
    return null
  }
}

const ESTADO_DOC_CONFIG: Record<string, { label: string; badgeClass: string; icon: string }> = {
  validado: {
    label: 'Aprobado',
    badgeClass: 'bg-green-100 text-green-700',
    icon: 'M5 13l4 4L19 7',
  },
  pendiente: {
    label: 'En revisión',
    badgeClass: 'bg-blue-100 text-blue-700',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  rechazado: {
    label: 'Rechazado',
    badgeClass: 'bg-red-100 text-red-700',
    icon: 'M6 18L18 6M6 6l12 12',
  },
  no_subido: {
    label: 'Pendiente',
    badgeClass: 'bg-amber-100 text-amber-700',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
}

export default async function DocumentosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [inscripcion, docsData] = await Promise.all([
    getInscripcion(id),
    getDocumentos(id),
  ])

  if (!inscripcion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">No se pudo cargar la inscripcion.</p>
      </div>
    )
  }

  const documentos = docsData?.documentos ?? []
  const totalRequeridos = docsData?.total_requeridos ?? 0
  const totalValidados = docsData?.total_validados ?? 0
  const porcentaje = totalRequeridos > 0 ? Math.round((totalValidados / totalRequeridos) * 100) : 0
  const enRevision = documentos.filter((d: any) => d.estado === 'pendiente').length
  const pendientesAccion = documentos.filter((d: any) => d.estado === 'no_subido' || d.estado === 'rechazado').length

  return (
    <LayoutViajePadre
      inscripcionId={id}
      nombreViaje={inscripcion.viaje.nombre}
      destino={inscripcion.viaje.destino}
      estadoBadge={inscripcion.estado === 'confirmado' ? 'confirmado' : 'pre_inscrito'}
      nombreAlumno={`${inscripcion.alumno.nombre} ${inscripcion.alumno.apellidos}`}
      imagenUrl={inscripcion.viaje.imagen_url ?? undefined}
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-start gap-3">
          <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">
              Documentacion - {inscripcion.viaje.nombre}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">{inscripcion.alumno.nombre} {inscripcion.alumno.apellidos}</p>
          </div>
        </div>

        {/* Progreso */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Progreso de documentacion</span>
            <span className="text-gray-900 text-xs font-bold">{totalValidados}/{totalRequeridos} aprobados</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {totalValidados} aprobados
            </span>
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {enRevision} en revision
            </span>
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {pendientesAccion} pendientes
            </span>
          </div>
        </div>

        {/* Alerta de accion requerida */}
        {pendientesAccion > 0 && (
          <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 flex items-center gap-2 text-sm text-amber-800">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              Accion requerida: tienes {pendientesAccion} documento{pendientesAccion > 1 ? 's' : ''} pendiente{pendientesAccion > 1 ? 's' : ''} de subir. Por favor subelo{pendientesAccion > 1 ? 's' : ''} antes del plazo para no perder la plaza en el viaje.
            </span>
          </div>
        )}

        {/* Lista de documentos */}
        <div className="divide-y divide-gray-50">
          {documentos.map((doc: any) => {
            const config = ESTADO_DOC_CONFIG[doc.estado] ?? ESTADO_DOC_CONFIG.no_subido
            return (
              <div key={doc.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        {doc.obligatorio && (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                            Obligatorio
                          </span>
                        )}
                        <h3 className="font-bold text-gray-900 text-sm">{doc.nombre}</h3>
                      </div>
                      <p className="text-gray-500 text-xs">{doc.descripcion}</p>
                      {doc.nombre_archivo && (
                        <p className="text-primary text-xs mt-1 font-medium">{doc.nombre_archivo}</p>
                      )}
                      {doc.motivo_rechazo && (
                        <p className="text-red-600 text-xs mt-1.5 bg-red-50 rounded px-2 py-1.5">
                          {doc.motivo_rechazo}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${config.badgeClass}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                      </svg>
                      {config.label}
                    </span>
                    {(doc.estado === 'no_subido' || doc.estado === 'rechazado') && (
                      <button className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap">
                        {doc.estado === 'rechazado' ? 'Volver a subir' : 'Subir documento'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </LayoutViajePadre>
  )
}
