import { PlanCuotas } from '@/components/padre/PlanCuotas'
import { FormularioPago } from '@/components/padre/FormularioPago'

async function getInscripcion(id: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/inscripciones/${id}/`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

async function getCuotas(viajeId: string) {
  const res = await fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/viajes/${viajeId}/plan-pago/`, { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  return data.cuotas ?? []
}

export default async function PagosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inscripcion = await getInscripcion(id)
  if (!inscripcion) return <div className="p-12 text-center text-gray-500">Inscripcion no encontrada.</div>

  const cuotas = await getCuotas(inscripcion.viaje.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{inscripcion.viaje.nombre}</h1>
          <p className="text-sm text-gray-500">{inscripcion.viaje.destino}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
          <PlanCuotas cuotas={cuotas} totalPagado={inscripcion.total_pagado} saldoPendiente={inscripcion.saldo_pendiente} />
        </div>
        <FormularioPago inscripcionId={id} cuotas={cuotas} onExito={() => {}} />
      </div>
    </div>
  )
}