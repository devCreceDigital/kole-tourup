import Link from 'next/link'
import React from 'react'

type AlertType = 'warning' | 'error' | 'info' | 'success'

interface AlertCardProps {
  tipo: AlertType
  titulo: string
  mensaje: string
  href: string
  icon?: React.ReactNode
}

const typeClasses: Record<AlertType, string> = {
  warning: 'border-yellow-400 bg-yellow-50 text-yellow-800',
  error: 'border-red-400 bg-red-50 text-red-800',
  info: 'border-blue-400 bg-blue-50 text-blue-800',
  success: 'border-green-400 bg-green-50 text-green-800',
}

export function AlertCard({ tipo, titulo, mensaje, href, icon }: AlertCardProps) {
  return (
    <Link href={href}>
      <div className={`border-l-4 p-4 rounded-r cursor-pointer hover:opacity-80 transition-opacity ${typeClasses[tipo]}`}>
        <div className="flex items-start gap-2">
          {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
          <div>
            <p className="font-semibold text-sm">{titulo}</p>
            <p className="text-sm mt-1">{mensaje}</p>
          </div>
        </div>
      </div>
    </Link>
  )
}