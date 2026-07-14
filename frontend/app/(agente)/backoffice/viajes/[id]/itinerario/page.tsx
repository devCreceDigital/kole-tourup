import { ConstructorItinerario } from '@/components/agente/ConstructorItinerario'
import Link from 'next/link'
import { cookies } from 'next/headers'

async function getItinerario(viajeId: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}
  const res = await fetch(`${gatewayUrl}/api/v1/viajes/${viajeId}/itinerario/`, {
    cache: 'no-store',
    headers
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.etapas ?? []
}

async function getPlantillas() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}
  const res = await fetch(`${gatewayUrl}/api/v1/itinerarios-plantilla/`, {
    cache: 'no-store',
    headers
  })
  if (!res.ok) return []
  return res.json()
}

async function getViaje(id: string) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL
  const headers: Record<string, string> = token ? { Cookie: `access_token=${token}` } : {}
  const res = await fetch(`${gatewayUrl}/api/v1/viajes/${id}/`, {
    cache: 'no-store',
    headers
  })
  if (!res.ok) return null
  return res.json()
}

export default async function ItinerarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [viaje, etapas, plantillas] = await Promise.all([getViaje(id), getItinerario(id), getPlantillas()])
  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href={`/backoffice/viajes/${id}`} className="hover:underline">{viaje?.nombre ?? 'Viaje'}</Link>
          <span>›</span>
          <span>Constructor de itinerario</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Itinerario</h1>
        <p className="text-sm text-gray-500 mt-0.5">{etapas.length} días · arrastra las actividades para reordenar</p>
      </div>
      <ConstructorItinerario
        etapasIniciales={etapas}
        viajeId={id}
        plantillasIniciales={plantillas}
        tieneInscripciones={viaje?.inscripciones_count > 0}
      />
    </div>
  )
}
