interface Etapa {
  dia_numero: number
  titulo: string
  descripcion: string
}

interface ItinerarioResumenProps {
  etapas: Etapa[]
}

export function ItinerarioResumen({ etapas }: ItinerarioResumenProps) {
  const etapasVisibles = etapas.slice(0, 6)
  return (
    <section id="programa" className="py-12 px-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Conoce el itinerario</h2>
      <div className="space-y-3">
        {etapasVisibles.map((etapa) => (
          <details key={etapa.dia_numero} className="border border-gray-200 rounded-lg overflow-hidden">
            <summary className="bg-blue-800 text-white px-4 py-3 cursor-pointer font-semibold list-none hover:bg-blue-700">
              Dia {etapa.dia_numero}: {etapa.titulo}
            </summary>
            <div className="px-4 py-3 text-gray-600 text-sm">{etapa.descripcion}</div>
          </details>
        ))}
      </div>
    </section>
  )
}