import Link from 'next/link'

interface SubCardAlojamientoProps {
  hotelNombre?: string
  mapsUrl?: string
}

export function SubCardAlojamiento({ hotelNombre, mapsUrl }: SubCardAlojamientoProps) {
  return (
    <div className="border border-gray-200 bg-white rounded-xl p-4">
      <span className="text-2xl block mb-2">🏨</span>
      <h3 className="font-semibold text-gray-900 text-sm">Alojamiento</h3>
      {hotelNombre ? (
        <>
          <p className="text-xs text-gray-600 mt-1">{hotelNombre}</p>
          {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 block">Ver en mapa</a>}
        </>
      ) : (
        <p className="text-xs text-gray-400 mt-1">Por confirmar</p>
      )}
    </div>
  )
}