import { cookies } from 'next/headers'

async function getInscripcionAlumno() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}
  const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/`, { cache: 'no-store', headers })
  if (!res.ok) return null
  const data = await res.json()
  return data[0] ?? null
}

export default async function AlumnoPage() {
  const inscripcion = await getInscripcionAlumno()
  if (!inscripcion) return (
    <div className="p-12 text-center text-gray-500">
      <p className="text-4xl mb-4">✈️</p>
      <p>No tienes viajes asignados.</p>
    </div>
  )

  const viaje = inscripcion.viaje
  const etapas = viaje?.itinerario?.etapas ?? []
  const docs = inscripcion.documentos_resumen

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">{viaje?.nombre}</h2>
        <p className="text-sm text-gray-500 mt-1">{viaje?.destino} · {viaje?.fecha_salida} al {viaje?.fecha_regreso}</p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-lg font-bold text-gray-800">{inscripcion.estado}</p>
            <p className="text-xs text-gray-500">Estado</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-lg font-bold text-green-700">{inscripcion.porcentaje_pagado}%</p>
            <p className="text-xs text-gray-500">Pagado</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-lg font-bold text-blue-700">{docs?.total_validados ?? 0}/{docs?.total_requeridos ?? 0}</p>
            <p className="text-xs text-gray-500">Documentos</p>
          </div>
        </div>
      </div>

      {etapas.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Itinerario</h3>
          <div className="space-y-3">
            {etapas.map((etapa: any) => (
              <div key={etapa.dia_numero} className="border-l-4 border-blue-800 pl-4">
                <p className="font-semibold text-sm text-blue-800">Dia {etapa.dia_numero}: {etapa.titulo}</p>
                <p className="text-xs text-gray-500 mt-1">{etapa.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Documentacion</h3>
        {docs?.total_requeridos === 0 ? (
          <p className="text-sm text-gray-400">No hay documentos requeridos.</p>
        ) : (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${docs?.total_requeridos > 0 ? (docs.total_validados / docs.total_requeridos) * 100 : 0}%` }} />
            </div>
            <p className="text-sm text-gray-600">{docs?.total_validados} de {docs?.total_requeridos} documentos validados</p>
            {docs?.tiene_rechazado && <p className="text-xs text-red-600">Tienes documentos rechazados — contacta a tu padre/tutor.</p>}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Contacto</h3>
        <p className="text-sm text-gray-600 mb-4">Si tienes dudas o necesitas ayuda, contacta a tu agencia de viajes.</p>
        <a
          href={`https://wa.me/?text=${encodeURIComponent('Hola, necesito ayuda con mi viaje en Tottem Hub')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Contactar por WhatsApp
        </a>
      </div>
    </div>
  )
}