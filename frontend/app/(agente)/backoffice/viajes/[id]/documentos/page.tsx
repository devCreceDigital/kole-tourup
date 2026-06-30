import { PanelValidacionDocumento } from '@/components/agente/PanelValidacionDocumento'
import Link from 'next/link'

async function getDocumentos(viajeId: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/documentos/?viaje_id=${viajeId}&estado=pendiente`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

async function getViaje(id: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/viajes/${id}/`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function ValidacionDocumentosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [viaje, documentos] = await Promise.all([getViaje(id), getDocumentos(id)])
  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href={`/backoffice/viajes/${id}`} className="hover:underline">{viaje?.nombre ?? 'Viaje'}</Link>
          <span>›</span>
          <span>Validacion de documentos</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Documentos pendientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">{documentos.length} documentos por revisar</p>
      </div>
      <PanelValidacionDocumento documentos={documentos} />
    </div>
  )
}