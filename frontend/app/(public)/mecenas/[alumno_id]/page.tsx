'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchApi } from '@/lib/api'

interface CampaniaData {
  alumno_nombre: string
  apellidos: string
  destino: string
  fecha_salida: string
  dias_restantes: number
  apoyos: number
  recaudado: number
  meta: number
}

export default function MecenasPage() {
  const params = useParams()
  const alumnoId = params.alumno_id as string

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CampaniaData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!alumnoId) return
    setLoading(true)
    fetchApi(`/api/v1/mecenas/campania/${alumnoId}/`)
      .then((res) => {
        setData(res as CampaniaData)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => setLoading(false))
  }, [alumnoId])

  const alumno = {
    nombre: data?.alumno_nombre ?? 'Ignacio',
    destino: data?.destino ?? 'Nápoles / Pompeya / Positano',
    fechaViaje: data?.fecha_salida
      ? new Date(data.fecha_salida).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
      : '04 de Agosto',
    imagen_url: null as string | null,
  }

  const diasRestantes = data?.dias_restantes ?? 280
  const apoyos = data?.apoyos ?? 0
  const recaudado = data?.recaudado ?? 0
  const meta = data?.meta ?? 700

  const porcentaje = meta > 0 ? Math.round((recaudado / meta) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Navbar mínima (pública) ── */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 h-11 flex items-center gap-2">
          <div className="w-6 h-6 bg-[#0077B6] rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">Tottem Hub</span>
        </div>
      </header>

      {/* ── Header: foto alumno + imagen destino ── */}
      <div className="relative h-44 bg-gradient-to-br from-blue-500 to-indigo-700 overflow-hidden">
        {alumno.imagen_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={alumno.imagen_url} alt={alumno.nombre} className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {/* Avatar del alumno */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2">
          <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-[#0077B6] font-bold text-2xl">
            {alumno.nombre.charAt(0)}
          </div>
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center text-white">
          <p className="text-sm font-medium drop-shadow">Hola <strong>{alumno.nombre}</strong></p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── Banner del viaje ── */}
        <div className="bg-[#0077B6] rounded-xl p-5 text-white text-center">
          <p className="text-sm font-medium opacity-80 mb-1">Ayuda a {alumno.nombre}...</p>
          <p className="font-bold text-base leading-snug">
            Con su viaje a {alumno.destino}. Fecha {alumno.fechaViaje}
          </p>
        </div>

        {/* ── Estadísticas ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { valor: diasRestantes, label: 'Días restantes', icon: '📅' },
            { valor: apoyos,        label: 'Apoyos',         icon: '❤️' },
            { valor: `${recaudado}€`, label: 'en su hucha',  icon: '💰' },
          ].map(({ valor, label, icon }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
              <span className="text-xl">{icon}</span>
              <p className="text-xl font-bold text-gray-900 mt-1">{valor}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Progreso de donación ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Progreso</span>
            <div className="text-right">
              <span className="text-xs text-gray-400">Llevamos un</span>
              <span className="ml-1 text-sm font-bold text-[#0077B6]">{porcentaje}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden mb-3">
            <div
              className="h-3 rounded-full bg-[#0077B6] transition-all duration-500"
              style={{ width: `${Math.max(porcentaje, 2)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{recaudado}€ recaudado</span>
            <span>de {meta.toLocaleString('es-ES', { minimumFractionDigits: 2 })}€</span>
          </div>

          <button className="w-full mt-4 py-3 bg-[#0077B6] text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition-colors shadow-sm">
            Hacer donación
          </button>
        </div>

        {/* ── Descripción ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-2">Es hora de ayudar a {alumno.nombre}</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            El viaje de fin de curso es una experiencia para toda la vida: viajar y descubrir el mundo junto con compañeros es el recuerdo más imborrable. Ahora puedes ser parte de ese experiencia ayudando a costear su viaje de fin de curso de una forma innovadora, cómoda y 100% segura a través de esta web.
          </p>
        </div>

        {/* ── Las dos opciones ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Mecenas de viaje */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-3xl mb-3">🎒</div>
            <h3 className="font-bold text-gray-900 mb-2">¡Sé mecenas de viaje!</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Y es que pocas cosas más hacen más felices que ayudar a los demás: realiza una donación, vive una experiencia ayudando, ¡anímate!
            </p>
            <button className="w-full py-2.5 bg-[#0077B6] text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition-colors">
              Hacer donación
            </button>
          </div>

          {/* Tienda */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="text-3xl mb-3">🛍️</div>
            <h3 className="font-bold text-gray-900 mb-2">Compra alguno de sus productos</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Accede a su tienda virtual y compra alguno de los productos que ofrece de forma colaborativa. Además: descuentos en Spotify, Netflix, cheques regalo...
            </p>
            <button className="w-full py-2.5 bg-[#0077B6] text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition-colors">
              Ver su tienda
            </button>
          </div>
        </div>

        {/* ── La tienda de [nombre] ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">La tienda de {alumno.nombre}</h2>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="p-5 text-center">
              <div className="text-2xl mb-2">🛒</div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">Acceso a tienda</h3>
              <p className="text-xs text-gray-500 mb-3">
                Comparte esta url y deja que tus conocidos colaboren con el viaje.
              </p>
              <button className="w-full py-2 bg-[#0077B6] text-white font-semibold rounded-lg text-xs hover:bg-blue-700 transition-colors">
                Acceso a tienda
              </button>
            </div>
            <div className="p-5 text-center">
              <div className="text-2xl mb-2">📋</div>
              <h3 className="font-semibold text-gray-800 text-sm mb-1">Histórico tienda</h3>
              <p className="text-xs text-gray-500 mb-3">
                Consulta todas las colaboraciones que ha recibido {alumno.nombre}.
              </p>
              <button className="w-full py-2 bg-[#0077B6] text-white font-semibold rounded-lg text-xs hover:bg-blue-700 transition-colors">
                Histórico tienda
              </button>
            </div>
          </div>
        </div>

        {/* ── Footer simple ── */}
        <div className="text-center pb-4">
          <p className="text-xs text-gray-400">
            Portal de mecenas — Tottem Hub · LICENCIA AGENCIA DE VIAJES: CIAN 298009-2
          </p>
        </div>

      </div>
    </div>
  )
}
