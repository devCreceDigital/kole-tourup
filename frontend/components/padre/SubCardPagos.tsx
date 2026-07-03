import Link from 'next/link'

interface SubCardPagosProps {
  totalCuotas: number
  cuotasPagadas: number
  tieneCuotaVencida: boolean
  href: string
}

export function SubCardPagos({ totalCuotas, cuotasPagadas, tieneCuotaVencida, href }: SubCardPagosProps) {
  return (
    <Link href={href} className="block group">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="font-semibold text-gray-800 text-sm">Pagos</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">{cuotasPagadas}/{totalCuotas} pagado</p>
        {tieneCuotaVencida ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 w-fit">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v3.75m0 3.75h.007v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Vencido
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 w-fit">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Al día
          </span>
        )}
      </div>
    </Link>
  )
}
