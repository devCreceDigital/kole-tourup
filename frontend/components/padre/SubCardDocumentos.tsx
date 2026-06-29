import Link from 'next/link'

interface SubCardDocumentosProps {
  totalRequeridos: number
  totalValidados: number
  tieneRechazado: boolean
  href: string
}

export function SubCardDocumentos({ totalRequeridos, totalValidados, tieneRechazado, href }: SubCardDocumentosProps) {
  return (
    <Link href={href}>
      <div className={`border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer ${tieneRechazado ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">📄</span>
          {tieneRechazado && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Rechazado</span>}
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">Documentos</h3>
        <p className="text-xs text-gray-500 mt-1">{totalValidados} de {totalRequeridos} validados</p>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${totalRequeridos > 0 ? (totalValidados / totalRequeridos) * 100 : 0}%` }} />
        </div>
      </div>
    </Link>
  )
}