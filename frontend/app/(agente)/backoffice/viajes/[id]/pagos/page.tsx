import { PanelVerificacionPago } from '@/components/agente/PanelVerificacionPago'
import Link from 'next/link'

async function getPagos(viajeId: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/pagos/?viaje_id=${viajeId}&estado=pendiente`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

async function getViaje(id: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/viajes/${id}/`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function VerificacionPagosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [viaje, pagos] = await Promise.all([getViaje(id), getPagos(id)])
  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href={`/backoffice/viajes/${id}`} className="hover:underline">{viaje?.nombre ?? 'Viaje'}</Link>
          <span>›</span>
          <span>Verificacion de pagos</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Pagos pendientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">{pagos.length} pagos por revisar</p>
      </div>
      <PanelVerificacionPago pagos={pagos} />
    </div>
  )
}