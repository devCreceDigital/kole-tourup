import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'

async function getViaje(id: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/viajes/${id}/`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

async function getInscripciones(viajeId: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/inscripciones/?viaje_id=${viajeId}`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

const ESTADO_BADGE: Record<string, { variant: 'success' | 'warning' | 'info' | 'default', icon: string }> = {
  activo:    { variant: 'success', icon: '✓' },
  borrador:  { variant: 'default', icon: '○' },
  cerrado:   { variant: 'warning', icon: '!' },
  archivado: { variant: 'info',    icon: '▣' },
}

export default async function ViajeDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [viaje, inscripciones] = await Promise.all([
    getViaje(id),
    getInscripciones(id)
  ])
  if (!viaje) return <div className="p-8 text-gray-500">Viaje no encontrado.</div>

  const badge = ESTADO_BADGE[viaje.estado] ?? ESTADO_BADGE.borrador
  const porcentaje = viaje.cupo_maximo > 0 ? Math.round((inscripciones.length / viaje.cupo_maximo) * 100) : 0

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{viaje.nombre}</h1>
            <Badge text={viaje.estado} icon={badge.icon} variant={badge.variant} />
          </div>
          <p className="text-sm text-gray-500">{viaje.destino} · {viaje.fecha_salida} → {viaje.fecha_regreso}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/viajes/${viaje.slug}`} target="_blank" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
            Ver landing
          </Link>
          <Link href={`/backoffice/viajes/${id}/comunicados`} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            Enviar comunicado
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{inscripciones.length}</p>
          <p className="text-xs text-gray-500 mt-1">Inscritos</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{viaje.cupo_maximo}</p>
          <p className="text-xs text-gray-500 mt-1">Cupo maximo</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700">S/ {viaje.precio_total}</p>
          <p className="text-xs text-gray-500 mt-1">Precio</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">Ocupacion</p>
          <ProgressBar porcentaje={porcentaje} />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Inscripciones</h2>
          <span className="text-sm text-gray-500">{inscripciones.length} alumnos</span>
        </div>
        {inscripciones.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No hay inscripciones aun.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Alumno</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Pagos</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Docs</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inscripciones.map((ins: any) => (
                <tr key={ins.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{ins.alumno?.nombre} {ins.alumno?.apellidos}</td>
                  <td className="px-4 py-3"><Badge text={ins.estado} icon="○" variant="default" /></td>
                  <td className="px-4 py-3 text-gray-500">{ins.pagos_resumen?.cuotas_pagadas ?? 0}/{ins.pagos_resumen?.total_cuotas ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">{ins.documentos_resumen?.total_validados ?? 0}/{ins.documentos_resumen?.total_requeridos ?? 0}</td>
                  <td className="px-4 py-3">
                    <Link href={`/backoffice/inscripciones/${ins.id}`} className="text-blue-600 hover:underline text-xs">Ver</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}