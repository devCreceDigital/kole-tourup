import { cookies } from 'next/headers'

async function getInscripciones() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}
  try {
    const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/`, { cache: 'no-store', headers })
    if (!res.ok) return []
    return await res.json()
  } catch (error) {
    console.error('Error fetching inscripciones:', error)
    return []
  }
}

async function getMecenas(id: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}
  try {
    const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/${id}/mecenas/`, { cache: 'no-store', headers })
    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error('Error fetching mecenas:', error)
    return null
  }
}

function formatMonto(valor: number) {
  return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor)
}

export default async function PerfilPage() {
  const inscripciones = await getInscripciones()

  if (!inscripciones || inscripciones.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">No tienes inscripciones activas todavia.</p>
      </div>
    )
  }

  const inscripcion = inscripciones[0]
  const mecenasData = await getMecenas(inscripcion.id)

  const recaudado = mecenasData?.recaudado ?? 0
  const meta = mecenasData?.meta ?? inscripcion.precio_final ?? 0
  const porcentaje = mecenasData?.porcentaje ?? 0
  const apoyosCount = mecenasData?.apoyos_count ?? 0
  const diasRestantes = mecenasData?.dias_restantes

  const nombreAlumno = inscripcion.alumno?.nombre || inscripcion.alumno?.nombres || 'tu hij@'
  const nombrePadre = inscripcion.padre_nombre || nombreAlumno
  const destino = inscripcion.viaje?.nombre || inscripcion.viaje?.destino || 'su viaje'

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-5">

        {/* Hero */}
        <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 bg-white">
          <div
            className="relative h-40 sm:h-52 bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(to bottom, rgba(13,79,124,0.15), rgba(13,79,124,0.55)), url('https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&q=80')",
            }}
          >
            <div className="absolute inset-0 flex items-end p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                  {nombrePadre.charAt(0).toUpperCase()}
                </div>
                <p className="text-white font-semibold text-lg drop-shadow-sm">Hola, {nombrePadre}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-primary/5 border-t border-primary/10">
            <p className="text-sm text-gray-700">
              Ayuda a <span className="font-semibold text-primary">{nombreAlumno}</span> con su viaje a{' '}
              <span className="font-semibold">{destino}</span>
            </p>
          </div>
        </div>

        {/* Metricas rapidas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-gray-900">{diasRestantes ?? '-'}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Dias restantes</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-gray-900">{apoyosCount}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Apoyos</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-gray-900">S/ {formatMonto(recaudado)}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">En su hucha</p>
          </div>
        </div>

        {/* Panel de recaudacion */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Es hora de ayudar a {nombreAlumno}</h2>
            <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-3 py-1">
              {porcentaje}%
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Cada aporte acerca a {nombreAlumno} a vivir esta experiencia. Comparte el link con familiares y amigos para que puedan colaborar.
          </p>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-1.5">
              <span>Conseguido S/ {formatMonto(recaudado)}</span>
              <span>Meta S/ {formatMonto(meta)}</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(porcentaje, 100)}%` }}
              />
            </div>
          </div>

          <button className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
            Hacer donacion
          </button>
        </div>

        {/* Ultimas colaboraciones */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 text-sm mb-1">Ultimas colaboraciones</h3>
          {mecenasData?.patrocinios && mecenasData.patrocinios.length > 0 ? (
            <div className="space-y-2 mt-3">
              {mecenasData.patrocinios.slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 font-medium">{p.mecenas.nombre}</span>
                  <span className="text-primary font-bold">S/ {formatMonto(parseFloat(p.monto_pagado))}</span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mt-1 mb-3">Conviertete en el primer apoyo</p>
              <button className="w-full bg-primary text-white rounded-lg py-2 text-xs font-semibold hover:bg-primary/90 transition-colors">
                Colabora ahora
              </button>
            </>
          )}
        </div>

        {/* Acciones */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-center">
            <div className="w-11 h-11 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-1">Comparte el link de apoyo</p>
            <p className="text-xs text-gray-500 mb-3">Deja que tus conocidos colaboren con el viaje</p>
            <button className="w-full bg-primary text-white rounded-lg py-2 text-xs font-semibold hover:bg-primary/90 transition-colors">
              Copiar enlace
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm text-center">
            <div className="w-11 h-11 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p className="font-semibold text-gray-900 text-sm mb-1">Tienda solidaria</p>
            <p className="text-xs text-gray-500 mb-3">Muy pronto podras comprar productos para apoyar el viaje</p>
            <button disabled className="w-full bg-gray-100 text-gray-400 rounded-lg py-2 text-xs font-semibold cursor-not-allowed">
              Proximamente
            </button>
          </div>
        </div>

        {/* Tienda del alumno */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">La tienda de {nombreAlumno}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Acceso a tienda</p>
              <p className="text-xs text-gray-500 mb-3">Comparte esta url y deja que tus conocidos colaboren con el viaje</p>
              <button disabled className="w-full bg-gray-100 text-gray-400 rounded-lg py-2 text-xs font-semibold cursor-not-allowed">
                Proximamente
              </button>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-800 mb-1">Historico tienda</p>
              <p className="text-xs text-gray-500 mb-3">Consulta todas las colaboraciones que ha recibido {nombreAlumno}</p>
              <button disabled className="w-full bg-gray-100 text-gray-400 rounded-lg py-2 text-xs font-semibold cursor-not-allowed">
                Proximamente
              </button>
            </div>
          </div>
        </div>

        {/* Historial de apoyos */}
        {mecenasData?.patrocinios && mecenasData.patrocinios.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Historial de apoyos</h3>
            <div className="space-y-2">
              {mecenasData.patrocinios.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.mecenas.nombre}</p>
                    {p.notas && <p className="text-xs text-gray-400">{p.notas}</p>}
                  </div>
                  <p className="text-sm font-bold text-primary">S/ {formatMonto(parseFloat(p.monto_pagado))}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
