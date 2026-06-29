import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SubCardPagos } from './SubCardPagos'
import { SubCardDocumentos } from './SubCardDocumentos'
import { SubCardAlojamiento } from './SubCardAlojamiento'

const ESTADO_BADGE: Record<string, { variant: 'default' | 'warning' | 'success' | 'info', icon: string }> = {
  pendiente: { variant: 'warning', icon: '○' },
  confirmado: { variant: 'success', icon: '✓' },
  cancelado: { variant: 'default', icon: '✕' },
  baja: { variant: 'default', icon: '↓' },
}

interface InscripcionCardProps {
  inscripcion: {
    id: string
    estado: string
    precio_final: number
    porcentaje_pagado: number
    viaje: { nombre: string; destino: string; fecha_salida: string }
    pagos_resumen: { total_cuotas: number; cuotas_pagadas: number; tiene_cuota_vencida: boolean }
    documentos_resumen: { total_requeridos: number; total_validados: number; tiene_rechazado: boolean }
    hotel_asignado?: { nombre: string; maps_url: string }
  }
}

export function InscripcionCard({ inscripcion }: InscripcionCardProps) {
  const badge = ESTADO_BADGE[inscripcion.estado] ?? ESTADO_BADGE.pendiente
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{inscripcion.viaje.nombre}</h2>
          <p className="text-sm text-gray-500">{inscripcion.viaje.destino} · {inscripcion.viaje.fecha_salida}</p>
        </div>
        <Badge text={inscripcion.estado} icon={badge.icon} variant={badge.variant} />
      </div>
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Progreso global</p>
        <ProgressBar porcentaje={inscripcion.porcentaje_pagado} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SubCardPagos
          totalCuotas={inscripcion.pagos_resumen.total_cuotas}
          cuotasPagadas={inscripcion.pagos_resumen.cuotas_pagadas}
          tieneCuotaVencida={inscripcion.pagos_resumen.tiene_cuota_vencida}
          href={`/app/inscripciones/${inscripcion.id}/pagos`}
        />
        <SubCardDocumentos
          totalRequeridos={inscripcion.documentos_resumen.total_requeridos}
          totalValidados={inscripcion.documentos_resumen.total_validados}
          tieneRechazado={inscripcion.documentos_resumen.tiene_rechazado}
          href={`/app/inscripciones/${inscripcion.id}/documentos`}
        />
        <SubCardAlojamiento
          hotelNombre={inscripcion.hotel_asignado?.nombre}
          mapsUrl={inscripcion.hotel_asignado?.maps_url}
        />
      </div>
    </div>
  )
}