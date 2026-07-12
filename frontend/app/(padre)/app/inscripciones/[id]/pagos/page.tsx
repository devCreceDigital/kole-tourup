'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { LayoutViajePadre } from '@/components/padre/LayoutViajePadre'
import { PagarSection } from '@/components/padre/PagarSection'
import { fetchApi } from '@/lib/api'

export default function PagosPage() {
  const params = useParams()
  const id = params.id as string

  const [inscripcion, setInscripcion] = useState<any | null>(null)
  const [planPago, setPlanPago] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [ins, plan] = await Promise.all([
          fetchApi(`/api/v1/inscripciones/${id}/`),
          fetchApi(`/api/v1/inscripciones/${id}/plan-pago/`),
        ])
        setInscripcion(ins)
        setPlanPago(plan)
      } catch (err) {
        console.error('Error loading payment data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id])

  if (loading) {
    return (
      <LayoutViajePadre
        inscripcionId={id}
        nombreViaje="..."
        destino="..."
        estadoBadge="pendiente"
        nombreAlumno="..."
      >
        <div className="text-center py-10 text-gray-400 text-sm">Cargando...</div>
      </LayoutViajePadre>
    )
  }

  if (!inscripcion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">No se pudo cargar la inscripcion.</p>
      </div>
    )
  }

  const cuotas = planPago?.cuotas ?? []
  const totalPlan = cuotas.reduce((sum: number, c: any) => sum + parseFloat(c.importe), 0)
  const pagado = cuotas
    .filter((c: any) => c.estado === 'pagado')
    .reduce((sum: number, c: any) => sum + parseFloat(c.importe), 0)
  const pendienteTotal = totalPlan - pagado
  const porcentajePagado = totalPlan > 0 ? Math.round((pagado / totalPlan) * 100) : 0
  const cuotasVencidas = cuotas.filter((c: any) => c.estado === 'vencido')
  const primeraCuotaPendiente = cuotas.find((c: any) => c.estado === 'vencido' || c.estado === 'pendiente')

  return (
    <LayoutViajePadre
      inscripcionId={id}
      nombreViaje={inscripcion.viaje.nombre}
      destino={inscripcion.viaje.destino}
      estadoBadge={inscripcion.estado === 'confirmado' ? 'confirmado' : 'pre_inscrito'}
      nombreAlumno={`${inscripcion.alumno.nombre} ${inscripcion.alumno.apellidos}`}
      imagenUrl={inscripcion.viaje.imagen_url ?? undefined}
    >
      {!planPago ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <p className="text-gray-400 text-sm">El plan de pagos todavia no esta disponible.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Resumen */}
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm mb-4">
              Plan de Pagos - {inscripcion.viaje.nombre}
            </h2>
            <div className="grid grid-cols-3 gap-4 text-sm mb-3">
              <div>
                <span className="text-gray-400 text-xs block mb-0.5">Precio total del viaje</span>
                <span className="font-bold text-gray-900">S/ {totalPlan.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block mb-0.5">Pagado hasta ahora</span>
                <span className="font-bold text-gray-900">S/ {pagado.toFixed(2)} <span className="text-primary font-semibold">({porcentajePagado}%)</span></span>
              </div>
              <div>
                <span className="text-gray-400 text-xs block mb-0.5">Pendiente</span>
                <span className="font-bold text-gray-900">S/ {pendienteTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${porcentajePagado}%` }}
              />
            </div>
          </div>

          {/* Alerta de vencidos */}
          {cuotasVencidas.length > 0 && (
            <div className="bg-red-50 border-b border-red-100 px-5 py-3 flex items-center gap-2 text-sm text-red-700">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                Tienes {cuotasVencidas.length} plazo{cuotasVencidas.length > 1 ? 's' : ''} vencido{cuotasVencidas.length > 1 ? 's' : ''}. Pagalo{cuotasVencidas.length > 1 ? 's' : ''} para evitar penalizaciones.
              </span>
            </div>
          )}

          <PagarSection
            inscripcionId={id}
            cuotas={cuotas}
            primeraCuotaPendiente={primeraCuotaPendiente}
          />
        </div>
      )}
    </LayoutViajePadre>
  )
}
