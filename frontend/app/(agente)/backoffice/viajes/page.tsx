import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { cookies } from 'next/headers'

async function getViajes() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const res = await fetch(`${gatewayUrl}/api/v1/viajes/`, {
    cache: 'no-store',
    headers: token ? { Cookie: `access_token=${token}` } : {}
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.results ?? data
}

const ESTADO_BADGE: Record<string, { variant: 'success' | 'warning' | 'info' | 'default', icon: string }> = {
  activo:    { variant: 'success', icon: '✓' },
  borrador:  { variant: 'default', icon: '○' },
  cerrado:   { variant: 'warning', icon: '!' },
  archivado: { variant: 'info',    icon: '▣' },
}

export default async function ViajesPage() {
  const viajes = await getViajes()
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Viajes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{viajes.length} viajes en total</p>
        </div>
        <Link href="/backoffice/viajes/nuevo" className="bg-blue-800 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">
          + Nuevo viaje
        </Link>
      </div>
      {viajes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-4">✈️</p>
          <p className="font-medium">No hay viajes aun</p>
          <Link href="/backoffice/viajes/nuevo" className="text-blue-600 underline text-sm mt-2 block">Crear el primero</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Viaje</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Destino</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fechas</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Inscritos</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {viajes.map((v: any) => {
                const badge = ESTADO_BADGE[v.estado] ?? ESTADO_BADGE.borrador
                const porcentaje = v.cupo_maximo > 0 ? Math.round((v.inscripciones_count / v.cupo_maximo) * 100) : 0
                return (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{v.destino}</td>
                    <td className="px-4 py-3 text-gray-500">{v.fecha_salida} → {v.fecha_regreso}</td>
                    <td className="px-4 py-3"><Badge text={v.estado} icon={badge.icon} variant={badge.variant} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{v.inscripciones_count ?? 0}/{v.cupo_maximo}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${porcentaje}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/backoffice/viajes/${v.id}`} className="text-blue-600 hover:underline text-xs">Ver</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}