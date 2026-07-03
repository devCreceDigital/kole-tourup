import Link from 'next/link'

interface SubCardDocumentosProps {
  totalRequeridos: number
  totalValidados: number
  tieneRechazado: boolean
  href: string
}

export function SubCardDocumentos({ totalRequeridos, totalValidados, tieneRechazado, href }: SubCardDocumentosProps) {
  const pendiente = totalValidados < totalRequeridos

  return (
    <Link href={href} className="block group">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
          </svg>
          <span className="font-semibold text-gray-800 text-sm">Documentos</span>
        </div>
        <p className="text-xs text-gray-500">{totalValidados}/{totalRequeridos} aprobado</p>
        {tieneRechazado ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 w-fit">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v3.75m0 3.75h.007v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Rechazado
          </span>
        ) : pendiente ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-fit">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v3.75m0 3.75h.007v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pendiente
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 w-fit">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Completo
          </span>
        )}
      </div>
    </Link>
  )
}
