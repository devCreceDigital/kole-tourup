import { AlertCard } from '@/components/ui/AlertCard'

interface Alerta {
  tipo: 'warning' | 'error' | 'info'
  titulo: string
  mensaje: string
  href: string
}

interface AlertasPendientesProps {
  alertas: Alerta[]
}

export function AlertasPendientes({ alertas }: AlertasPendientesProps) {
  if (alertas.length === 0) return null
  return (
    <div className="space-y-2 mb-6">
      {alertas.map((alerta, i) => (
        <AlertCard key={i} tipo={alerta.tipo} titulo={alerta.titulo} mensaje={alerta.mensaje} href={alerta.href} />
      ))}
    </div>
  )
}