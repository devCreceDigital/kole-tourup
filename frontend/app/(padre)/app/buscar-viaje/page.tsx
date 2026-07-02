'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { fetchApi } from '@/lib/api'

export default function BuscarViajePage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [colegio, setColegio] = useState('')
  const [destino, setDestino] = useState('')
  
  const [viajes, setViajes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)

  useEffect(() => {
    async function loadViajes() {
      try {
        const data = await fetchApi('/api/v1/viajes/publico/')
        setViajes(data?.results ?? (Array.isArray(data) ? data : []))
      } catch (err) {
        console.error('Error fetching viajes:', err)
      } finally {
        setLoading(false)
      }
    }
    loadViajes()
  }, [])

  const colegiosUnicos = Array.from(new Set(viajes.map(v => v.colegio?.trim()).filter(Boolean)))
  
  const destinosFiltrados = viajes
    .filter(v => !colegio || v.colegio?.trim() === colegio.trim())
    .map(v => v.destino)

  const destinosUnicos = Array.from(new Set(destinosFiltrados))

  // Si se selecciona un colegio y solo hay un destino, autoseleccionarlo
  useEffect(() => {
    if (destinosUnicos.length === 1 && destino !== destinosUnicos[0]) {
      setDestino(destinosUnicos[0])
    } else if (destinosUnicos.length === 0) {
      setDestino('')
    }
  }, [colegio, destinosUnicos])


  const handleBuscarCodigo = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBusqueda(null)
    if (!codigo.trim()) return

    const viaje = viajes.find(v => v.codigo?.toUpperCase() === codigo.trim().toUpperCase())
    if (viaje) {
      router.push(`/app/inscribir/${viaje.id}`)
    } else {
      setErrorBusqueda('Código de viaje no encontrado.')
    }
  }

  const handleSiguiente = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorBusqueda(null)
    if (!colegio || !destino) {
      setErrorBusqueda('Selecciona un colegio y destino.')
      return
    }

    const viaje = viajes.find(v => v.colegio?.trim() === colegio.trim() && v.destino === destino)
    if (viaje) {
      router.push(`/app/inscribir/${viaje.id}`)
    } else {
      setErrorBusqueda('No se encontró un viaje con esa combinación.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-8"
        >
          <h1 className="text-2xl font-bold text-[#0A2540] text-center mb-8">
            Encuentra el viaje de tu hijo/a
          </h1>

          <div className="space-y-4">
            <form onSubmit={handleBuscarCodigo}>
              <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                Búsqueda rápida
              </label>
              <div className="flex relative">
                <input
                  type="text"
                  placeholder="Tengo un código de viaje"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                />
                <button type="submit" className="px-6 py-2.5 bg-[#0077B6] text-white font-medium rounded-r-lg hover:bg-blue-700 transition-colors">
                  Buscar
                </button>
              </div>
            </form>

            <div className="relative py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">
                  o busca por tu centro educativo
                </span>
              </div>
            </div>

            <form onSubmit={handleSiguiente} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                  Nombre del colegio<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="lista-colegios"
                    placeholder="Buscar colegio..."
                    value={colegio}
                    onChange={(e) => setColegio(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <datalist id="lista-colegios">
                    {colegiosUnicos.map((col, idx) => (
                      <option key={idx} value={col as string} />
                    ))}
                  </datalist>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                    <span className="material-symbols-outlined text-lg">search</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0A2540] mb-1.5">
                  Destino del viaje<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    disabled={!colegio || destinosUnicos.length === 0}
                    className="w-full appearance-none px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-gray-50"
                  >
                    <option value="">
                      {colegio ? (destinosUnicos.length > 0 ? 'Seleccionar destino...' : 'No hay viajes para este colegio') : 'Primero selecciona un colegio'}
                    </option>
                    {destinosUnicos.map((dest, idx) => (
                      <option key={idx} value={dest as string}>{dest as string}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                  </div>
                </div>
              </div>

              {errorBusqueda && (
                <p className="text-red-500 text-sm font-medium text-center">{errorBusqueda}</p>
              )}

              <button
                type="submit"
                disabled={loading || (!colegio || !destino)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#0077B6] text-white rounded-lg text-base font-semibold hover:bg-blue-700 shadow-sm transition-all hover:-translate-y-0.5 mt-2 disabled:opacity-50 disabled:hover:-translate-y-0"
              >
                Siguiente
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </form>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#FEF9E7] rounded-xl p-5 border border-[#FBE9B6] text-center"
        >
          <p className="text-sm font-semibold text-[#8B6C1D] mb-3 flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
            ¿No encuentras el viaje?
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <button className="flex items-center gap-1.5 text-[#8B6C1D] hover:text-[#6A5215] font-medium transition-colors">
              <span className="material-symbols-outlined text-[18px]">call</span>
              Contactar soporte
            </button>
            <button className="flex items-center gap-1.5 text-[#8B6C1D] hover:text-[#6A5215] font-medium transition-colors">
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              Unirme con código
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
