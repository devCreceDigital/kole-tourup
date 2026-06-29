import Link from 'next/link'

interface SubCardPagosProps {
  totalCuotas: number
  cuotasPagadas: number
  tieneCuotaVencida: boolean
  href: string
}

export function SubCardPagos({ totalCuotas, cuotasPagadas, tieneCuotaVencida, href }: SubCardPagosProps) {
  return (
    <Link href={href}>
      <div className={`border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer ${tieneCuotaVencida ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">💳</span>
          {tieneCuotaVencida && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">Vencida</span>}
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">Pagos</h3>
        <p className="text-xs text-gray-500 mt-1">{cuotasPagadas} de {totalCuotas} cuotas pagadas</p>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${totalCuotas > 0 ? (cuotasPagadas / totalCuotas) * 100 : 0}%` }} />
        </div>
      </div>
    </Link>
  )
}