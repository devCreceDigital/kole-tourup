import { TablaInscritos } from '@/components/agente/TablaInscritos'
import Link from 'next/link'

async function getInscripciones(viajeId: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/inscripciones/?viaje_id=${viajeId}`, { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

async function getViaje(id: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/viajes/${id}/`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function InscritosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [viaje, inscripciones] = await Promise.all([
    getViaje(id),
    getInscripciones(id)
  ])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href={`/backoffice/viajes/${id}`} className="hover:underline">
              {viaje?.nombre ?? 'Viaje'}
            </Link>
            <span>›</span>
            <span>Inscritos</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de inscritos</h1>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-gray-900">{inscripciones.length}</p>
          <p className="text-xs text-gray-500">total inscritos</p>
        </div>
      </div>
      <TablaInscritos inscripciones={inscripciones} viajeId={id} />
    </div>
  )
}