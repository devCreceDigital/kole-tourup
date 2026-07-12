import { InscripcionCard } from '@/components/padre/InscripcionCard'
import { AlertasPendientes } from '@/components/padre/AlertasPendientes'
import { HijosRegistrados } from '@/components/padre/HijosRegistrados'
import { cookies } from 'next/headers'

async function getInscripciones() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}

  try {
    const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/`, { 
      cache: 'no-store',
      headers
    })
    if (!res.ok) return []
    return await res.json()
  } catch (error) {
    console.error('Error fetching inscripciones:', error)
    return []
  }
}

async function getMisAlumnos() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}
  try {
    const res = await fetch(`${gatewayUrl}/api/v1/inscripciones/mis-alumnos/`, {
      cache: 'no-store',
      headers
    })
    if (!res.ok) return []
    return await res.json()
  } catch (error) {
    console.error('Error fetching mis-alumnos:', error)
    return []
  }
}

export default async function DashboardPadrePage() {
  const [inscripciones, misAlumnos] = await Promise.all([
    getInscripciones(),
    getMisAlumnos(),
  ])

  const alertas = inscripciones.flatMap((ins: any) => {
    const a = []
    if (ins.pagos_resumen?.tiene_cuota_vencida) {
      a.push({
        tipo: 'error' as const,
        titulo: 'Cuota vencida',
        mensaje: 'Tienes una cuota vencida en ' + ins.viaje.nombre,
        href: `/app/inscripciones/${ins.id}/pagos`
      })
    }
    if (ins.documentos_resumen?.tiene_rechazado) {
      a.push({
        tipo: 'warning' as const,
        titulo: 'Documento rechazado',
        mensaje: 'Un documento fue rechazado en ' + ins.viaje.nombre,
        href: `/app/inscripciones/${ins.id}/documentos`
      })
    }
    return a
  })

  const hijosMap = new Map()
  inscripciones.forEach((ins: any) => {
    if (!hijosMap.has(ins.alumno.id)) {
      hijosMap.set(ins.alumno.id, {
        id: ins.alumno.id,
        nombreCompleto: `${ins.alumno.nombre} ${ins.alumno.apellidos}`,
        colegio: ins.colegio || '',
        gradoNivel: `${ins.grado || ''} ${ins.nivel_educativo || ''}`.trim(),
        alergias: ins.alergias || [],
        fechaNacimiento: ins.alumno.fecha_nacimiento || null,
      })
    }
  })
  // Sumamos alumnos registrados de forma independiente (sin inscripcion aun)
  misAlumnos.forEach((al: any) => {
    if (!hijosMap.has(al.id)) {
      hijosMap.set(al.id, {
        id: al.id,
        nombreCompleto: `${al.nombre} ${al.apellidos}`,
        colegio: al.colegio || '',
        gradoNivel: `${al.grado || ''} ${al.nivel_educativo || ''}`.trim(),
        alergias: [],
        fechaNacimiento: al.fecha_nacimiento || null,
      })
    }
  })
  const hijosUnicos = Array.from(hijosMap.values())

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-3xl mx-auto pt-6 px-4 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Bienvenid@
            </h1>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 shadow-sm transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Ayuda
          </button>
        </div>

        <AlertasPendientes alertas={alertas} />

        <div>
          <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            {inscripciones.length === 1 ? 'Viaje Activo' : 'Viajes Activos'}
          </h2>

          {inscripciones.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </div>
              {hijosUnicos.length === 0 ? (
                <>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Primero registra a tu hijo/a</h3>
                  <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                    Antes de buscar un viaje, registra los datos de tu hijo/a. Podras reutilizarlos despues.
                  </p>
                  <a
                    href="/app/hijos/nuevo"
                    className="inline-block px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Registrar hijo/a
                  </a>
                </>
              ) : (
                <>
                  <h3 className="text-base font-bold text-gray-900 mb-1">No tienes viajes activos</h3>
                  <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                    Si tu colegio organizó un viaje, búscalo para inscribir a tu hijo.
                  </p>
                  <a
                    href="/app/buscar-viaje"
                    className="inline-block px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Buscar viaje escolar
                  </a>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {inscripciones.map((ins: any) => (
                <InscripcionCard key={ins.id} inscripcion={ins} />
              ))}
            </div>
          )}
        </div>

        <HijosRegistrados hijos={hijosUnicos} />

      </div>
    </div>
  )
}
