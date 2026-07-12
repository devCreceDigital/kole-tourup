'use client'
import { useState, useMemo } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { FormularioPago } from './FormularioPago'

interface CuotaData {
  id: string
  numero_cuota: number
  descripcion: string
  importe: string
  fecha_vencimiento: string
  estado: string
}

interface PagarSectionProps {
  inscripcionId: string
  cuotas: CuotaData[]
  primeraCuotaPendiente: CuotaData | null
}

const ESTADO_CUOTA_CONFIG: Record<string, { label: string; badgeClass: string; icon: string }> = {
  pagado: {
    label: 'Pagado',
    badgeClass: 'bg-green-100 text-green-700',
    icon: 'M5 13l4 4L19 7',
  },
  en_revision: {
    label: 'En revisión',
    badgeClass: 'bg-blue-100 text-blue-700',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  vencido: {
    label: 'Vencido',
    badgeClass: 'bg-red-100 text-red-700',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  },
  pendiente: {
    label: 'Pendiente',
    badgeClass: 'bg-amber-100 text-amber-700',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
}

function formatFecha(fechaIso: string) {
  const [year, month, day] = fechaIso.split('-')
  return `${day}/${month}/${year}`
}

function PagarSectionInner({ inscripcionId, cuotas, primeraCuotaPendiente }: PagarSectionProps) {
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<string | null>(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const cuotasFormulario = useMemo(() =>
    cuotas
      .filter(c => !cuotaSeleccionada || c.id === cuotaSeleccionada)
      .map(c => ({ ...c, importe: parseFloat(c.importe) })),
    [cuotas, cuotaSeleccionada]
  )

  const handlePagar = (cuotaId?: string) => {
    setCuotaSeleccionada(cuotaId ?? null)
    setMostrarFormulario(true)
  }

  const handleExito = () => {
    setMostrarFormulario(false)
    setCuotaSeleccionada(null)
  }

  const safeParseFloat = (v: string | undefined) => {
    const n = parseFloat(v ?? '0')
    return isNaN(n) ? 0 : n
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
              <th className="px-5 py-3 font-semibold">Plazo</th>
              <th className="px-5 py-3 font-semibold">Importe</th>
              <th className="px-5 py-3 font-semibold">Vence el</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3 font-semibold text-right">Accion</th>
            </tr>
          </thead>
          <tbody>
            {cuotas.map((cuota) => {
              const config = ESTADO_CUOTA_CONFIG[cuota.estado] ?? ESTADO_CUOTA_CONFIG.pendiente
              const puedePagar = cuota.estado === 'vencido' || cuota.estado === 'pendiente'
              return (
                <tr key={cuota.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {cuota.numero_cuota}° {cuota.descripcion || 'Plazo'}
                  </td>
                  <td className="px-5 py-3 text-gray-700">S/ {safeParseFloat(cuota.importe).toFixed(2)}</td>
                  <td className="px-5 py-3 text-gray-500">{formatFecha(cuota.fecha_vencimiento)}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${config.badgeClass}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                      </svg>
                      {config.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {puedePagar ? (
                      <button
                        type="button"
                        onClick={() => handlePagar(cuota.id)}
                        className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                      >
                        Pagar
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {primeraCuotaPendiente && (
        <div className="p-5 flex flex-col sm:flex-row gap-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => handlePagar(primeraCuotaPendiente.id)}
            className="flex-1 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Pagar {primeraCuotaPendiente.numero_cuota}° plazo - S/ {safeParseFloat(primeraCuotaPendiente.importe).toFixed(2)}
          </button>
          <button
            type="button"
            onClick={() => window.location.href = `/app/chat/${inscripcionId}`}
            className="flex-1 sm:flex-none border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Hablar con la agencia
          </button>
        </div>
      )}

      {mostrarFormulario && (
        <div className="mt-6">
          <FormularioPago
            inscripcionId={inscripcionId}
            cuotas={cuotasFormulario}
            cuotaIdInicial={cuotaSeleccionada ?? undefined}
            onExito={handleExito}
          />
        </div>
      )}
    </>
  )
}

export function PagarSection(props: PagarSectionProps) {
  return (
    <ErrorBoundary>
      <PagarSectionInner {...props} />
    </ErrorBoundary>
  )
}
