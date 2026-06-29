import { ConstructorItinerario } from '@/components/agente/ConstructorItinerario'
import Link from 'next/link'

async function getItinerario(viajeId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/itinerario/`, { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  return data.etapas ?? []
}

async function getViaje(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${id}/`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function ItinerarioPage({ params }: { params: { id: string } }) {
  const [viaje, etapas] = await Promise.all([getViaje(params.id), getItinerario(params.id)])
  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href={`/backoffice/viajes/${params.id}`} className="hover:underline">{viaje?.nombre ?? 'Viaje'}</Link>
          <span>›</span>
          <span>Constructor de itinerario</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Itinerario</h1>
        <p className="text-sm text-gray-500 mt-0.5">{etapas.length} dias · arrastra las actividades para reordenar</p>
      </div>
      <ConstructorItinerario etapasIniciales={etapas} viajeId={params.id} />
    </div>
  )
}