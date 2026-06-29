'use client'
import Link from 'next/link'

interface Notificacion {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  referencia_id?: string
  referencia_tipo?: string
  created_at: string
}

interface ItemNotificacionProps {
  notificacion: Notificacion
  onMarcarLeida: (id: string) => void
}

const TIPO_CONFIG: Record<string, { icon: string; color: string }> = {
  pago_vencido:  { icon: '💳', color: 'bg-red-50 border-red-200' },
  doc_rechazado: { icon: '📄', color: 'bg-red-50 border-red-200' },
  doc_validado:  { icon: '✅', color: 'bg-green-50 border-green-200' },
  comunicado:    { icon: '📢', color: 'bg-blue-50 border-blue-200' },
  recordatorio:  { icon: '⏰', color: 'bg-yellow-50 border-yellow-200' },
}

function getHref(tipo: string, referenciaId?: string, referenciaTipo?: string): string {
  if (!referenciaId) return '#'
  if (tipo === 'pago_vencido' || tipo === 'recordatorio') return `/app/pagos/${referenciaId}`
  if (tipo === 'doc_rechazado' || tipo === 'doc_validado') return `/app/documentos/${referenciaId}`
  return '#'
}

export function ItemNotificacion({ notificacion, onMarcarLeida }: ItemNotificacionProps) {
  const cfg = TIPO_CONFIG[notificacion.tipo] ?? { icon: '🔔', color: 'bg-gray-50 border-gray-200' }
  const href = getHref(notificacion.tipo, notificacion.referencia_id, notificacion.referencia_tipo)
  return (
    <div className={`border rounded-xl p-4 flex items-start gap-3 ${cfg.color} ${!notificacion.leida ? 'ring-2 ring-blue-200' : ''}`}>
      <span className="text-2xl flex-shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold ${!notificacion.leida ? 'text-gray-900' : 'text-gray-600'}`}>{notificacion.titulo}</p>
          {!notificacion.leida && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{notificacion.mensaje}</p>
        <div className="flex items-center gap-3 mt-2">
          {href !== '#' && <Link href={href} className="text-xs text-blue-600 underline">Ver detalle</Link>}
          {!notificacion.leida && (
            <button onClick={() => onMarcarLeida(notificacion.id)} className="text-xs text-gray-400 hover:text-gray-600">
              Marcar como leida
            </button>
          )}
        </div>
      </div>
    </div>
  )
}