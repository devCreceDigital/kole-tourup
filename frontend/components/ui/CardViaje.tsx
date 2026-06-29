import Image from 'next/image'
import Link from 'next/link'
import { Badge } from './Badge'

interface CardViajeProps {
  id: string
  nombre: string
  destino: string
  fechaSalida: string
  fechaRegreso: string
  imagenUrl?: string
  estado: string
  totalInscritos?: number
  totalPagado?: number
  totalDocumentos?: number
}

const estadoBadge: Record<string, { variant: 'success' | 'info' | 'warning' | 'default', icon: string }> = {
  activo: { variant: 'success', icon: '✓' },
  borrador: { variant: 'default', icon: '○' },
  cerrado: { variant: 'warning', icon: '!' },
  archivado: { variant: 'info', icon: '▣' },
}

export function CardViaje({ id, nombre, destino, fechaSalida, fechaRegreso, imagenUrl, estado, totalInscritos = 0, totalPagado = 0, totalDocumentos = 0 }: CardViajeProps) {
  const badge = estadoBadge[estado] ?? estadoBadge.borrador
  return (
    <Link href={`/backoffice/viajes/${id}`}>
      <div className="rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white">
        <div className="relative h-40 bg-gray-100">
          {imagenUrl ? (
            <Image src={imagenUrl} alt={nombre} fill className="object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-4xl">✈</div>
          )}
          <div className="absolute top-2 right-2">
            <Badge text={estado} icon={badge.icon} variant={badge.variant} />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 truncate">{nombre}</h3>
          <p className="text-sm text-gray-500">{destino}</p>
          <p className="text-xs text-gray-400 mt-1">{fechaSalida} → {fechaRegreso}</p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="text-center bg-gray-50 rounded p-2">
              <p className="text-lg font-bold text-gray-800">{totalInscritos}</p>
              <p className="text-xs text-gray-500">Inscritos</p>
            </div>
            <div className="text-center bg-gray-50 rounded p-2">
              <p className="text-lg font-bold text-green-700">S/{totalPagado}</p>
              <p className="text-xs text-gray-500">Pagado</p>
            </div>
            <div className="text-center bg-gray-50 rounded p-2">
              <p className="text-lg font-bold text-blue-700">{totalDocumentos}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}