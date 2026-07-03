interface SubCardAlojamientoProps {
  hotelNombre?: string
  mapsUrl?: string
}

export function SubCardAlojamiento({ hotelNombre, mapsUrl }: SubCardAlojamientoProps) {
  const asignado = !!hotelNombre

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12V7a1 1 0 011-1h16a1 1 0 011 1v5M3 12h18M3 12v4a1 1 0 001 1h16a1 1 0 001-1v-4M7 8v4" />
        </svg>
        <span className="font-semibold text-gray-800 text-sm">Alojamiento</span>
      </div>
      <p className="text-xs text-gray-500 truncate">
        {hotelNombre || 'Por confirmar'}
      </p>
      {asignado ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 w-fit">
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Asignado
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 w-fit">
          <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
          </svg>
          Pendiente
        </span>
      )}
    </div>
  )
}
