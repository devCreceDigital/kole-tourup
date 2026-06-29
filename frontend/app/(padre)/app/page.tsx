import { InscripcionCard } from '@/components/padre/InscripcionCard'
import { AlertasPendientes } from '@/components/padre/AlertasPendientes'

import { cookies } from 'next/headers'

async function getInscripciones() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  
  // Use http://gateway:3001 for server-side fetch inside Docker
  const res = await fetch(`http://gateway:3001/api/v1/inscripciones/`, { 
    cache: 'no-store',
    headers: token ? { Cookie: `access_token=${token}` } : {}
  })
  if (!res.ok) return []
  return res.json()
}

export default async function DashboardPadrePage() {
  const inscripciones = await getInscripciones()

  const alertas = inscripciones.flatMap((ins: any) => {
    const a = []
    if (ins.pagos_resumen?.tiene_cuota_vencida) {
      a.push({ tipo: 'error' as const, titulo: 'Cuota vencida', mensaje: 'Tienes una cuota vencida en ' + ins.viaje.nombre, href: `/app/inscripciones/${ins.id}/pagos` })
    }
    if (ins.documentos_resumen?.tiene_rechazado) {
      a.push({ tipo: 'warning' as const, titulo: 'Documento rechazado', mensaje: 'Un documento fue rechazado en ' + ins.viaje.nombre, href: `/app/inscripciones/${ins.id}/documentos` })
    }
    return a
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mis viajes</h1>
        <p className="text-sm text-gray-500 mb-6">Consulta el estado de las inscripciones de tus hijos</p>
        <AlertasPendientes alertas={alertas} />
        {inscripciones.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">✈️</p>
            <p className="font-medium">No tienes inscripciones aun</p>
          </div>
        ) : (
          <div className="space-y-6">
            {inscripciones.map((ins: any) => (
              <InscripcionCard key={ins.id} inscripcion={ins} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}