import { HeroSection } from '@/components/public/HeroSection'
import { ItinerarioResumen } from '@/components/public/ItinerarioResumen'
import Link from 'next/link'

async function getViaje(slug: string) {
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://127.0.0.1:3001'
  const res = await fetch(`${gatewayUrl}/api/v1/viajes/publico/${slug}/`, { cache: 'no-store' })
  if (!res.ok) return null
  const data = await res.json()
  return data ?? null
}

export default async function ViajePublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const viaje = await getViaje(slug)
  if (!viaje) return <div className="p-12 text-center text-gray-500">Viaje no encontrado.</div>

  const etapas = viaje.itinerario?.etapas ?? []
  const inscritos = viaje.inscripciones_count ?? 0
  const cupoDisponible = Math.max(0, viaje.cupo_maximo - inscritos)

  return (
    <main className="min-h-screen bg-white">
      <HeroSection
        nombre={viaje.nombre}
        destino={viaje.destino}
        fechaSalida={viaje.fecha_salida}
        fechaRegreso={viaje.fecha_regreso}
        cupoMaximo={viaje.cupo_maximo}
        cupoDisponible={cupoDisponible}
        imagenUrl={viaje.imagen_url}
        inscribirHref={`/app/inscribir/${viaje.id}`}
      />

      <section className="py-8 px-6 bg-gray-50 border-b">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div><p className="text-2xl">📅</p><p className="font-semibold text-sm">{viaje.fecha_salida}</p><p className="text-xs text-gray-500">Fecha salida</p></div>
          <div><p className="text-2xl">📍</p><p className="font-semibold text-sm">{viaje.destino}</p><p className="text-xs text-gray-500">Destino</p></div>
          <div><p className="text-2xl">👥</p><p className="font-semibold text-sm">{cupoDisponible} plazas</p><p className="text-xs text-gray-500">Disponibles</p></div>
          <div><p className="text-2xl">💳</p><p className="font-semibold text-sm">Desde S/ {viaje.precio_total}</p><p className="text-xs text-gray-500">Fraccionado</p></div>
        </div>
      </section>

      <section className="py-10 px-6 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-6 border rounded-xl"><p className="text-3xl mb-2">⭐</p><h3 className="font-bold mb-1">Gestion Online</h3><p className="text-sm text-gray-500">Pagos, documentos y comunicados desde tu movil</p></div>
          <div className="p-6 border rounded-xl"><p className="text-3xl mb-2">🛡</p><h3 className="font-bold mb-1">Seguridad</h3><p className="text-sm text-gray-500">Agencia registrada en MINCETUR con licencia oficial</p></div>
          <div className="p-6 border rounded-xl"><p className="text-3xl mb-2">💳</p><h3 className="font-bold mb-1">Pago Fraccionado</h3><p className="text-sm text-gray-500">Divide el pago en cuotas comodas</p></div>
        </div>
      </section>

      {/* Grupos / Colegios */}
      {viaje.grupos?.length > 0 && (
        <section className="py-12 px-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Grupos participantes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {viaje.grupos.map((g: any) => {
              const cupoGrupo = g.capacidad ?? viaje.cupo_maximo
              const inscritosGrupo = g.alumnos_count ?? 0
              const disponibleGrupo = Math.max(0, cupoGrupo - inscritosGrupo)
              const pct = cupoGrupo > 0 ? Math.round((inscritosGrupo / cupoGrupo) * 100) : 0
              return (
                <div key={g.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-gray-900">{g.nombre}</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded-full">{disponibleGrupo} plazas</span>
                  </div>
                  {g.descripcion && <p className="text-sm text-gray-500 mb-3">{g.descripcion}</p>}
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                    <div className="h-2 rounded-full bg-blue-600 transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{inscritosGrupo} de {cupoGrupo} inscritos</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {etapas.length > 0 && <ItinerarioResumen etapas={etapas} />}

      <section className="py-16 px-6 bg-blue-800 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Preparados para el despegue?</h2>
        <p className="text-blue-200 mb-8">Quedan {cupoDisponible} plazas disponibles</p>
        <Link href={`/app/inscribir/${viaje.id}`} className="bg-yellow-400 text-gray-900 font-bold px-10 py-4 rounded-lg hover:bg-yellow-300 transition-colors text-lg">
          INSCRIBIR A MI HIJ@
        </Link>
      </section>

      <footer className="py-8 px-6 bg-gray-900 text-gray-400 text-center text-xs">
        <p>Tottem Travel · Agencia autorizada MINCETUR · {new Date().getFullYear()}</p>
      </footer>
    </main>
  )
}