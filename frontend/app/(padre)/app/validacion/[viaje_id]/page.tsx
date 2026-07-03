'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'
import { Suspense } from 'react'

function ValidacionContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const viajeId = params.viaje_id as string

  const colegioInput = searchParams.get('colegio') || ''
  const nivelInput   = searchParams.get('nivel') || ''
  const gradoInput   = searchParams.get('grado') || ''

  const [viaje, setViaje] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadViaje() {
      try {
        const res = await fetchApi(`/api/v1/viajes/publico/${viajeId}/`)
        setViaje(res)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadViaje()
  }, [viajeId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0077B6] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Comparar datos ingresados vs datos del viaje
  const viajeColegio = viaje?.colegio?.trim().toLowerCase() || ''
  const viajeNivel   = viaje?.nivel_educativo?.trim().toLowerCase() || ''
  const viajeGrado   = viaje?.grado?.trim().toLowerCase() || ''

  const matchColegio = !viajeColegio || colegioInput.trim().toLowerCase() === viajeColegio
  const matchNivel   = !viajeNivel || nivelInput.trim().toLowerCase() === viajeNivel
  const matchGrado   = !viajeGrado || gradoInput.trim().toLowerCase() === viajeGrado
  const isValid = matchColegio && matchNivel && matchGrado

  const handleConfirmar = () => {
    router.push(`/app/inscribir/${viajeId}`)
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Cabecera del viaje */}
        {viaje && (
          <div className="relative h-40 rounded-xl overflow-hidden bg-gray-200">
            {viaje.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viaje.imagen_url} alt={viaje.nombre} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-700" />
            )}
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 p-5 flex flex-col justify-end">
              <h1 className="text-xl font-bold text-white drop-shadow-md">{viaje.nombre}</h1>
              <div className="mt-1">
                <span className="inline-block text-[11px] font-semibold text-white bg-green-600 rounded-full px-2.5 py-0.5">
                  Plaza confirmada
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Card de validación */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0077B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <h2 className="font-bold text-gray-900">Validación de Inscripción al Viaje</h2>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Box resultado */}
            {isValid ? (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">¡Perfecto!</p>
                  <p className="text-sm text-green-700 mt-0.5">
                    Este viaje es para alumnos de{' '}
                    <strong>{[viaje?.grado, viaje?.nivel_educativo].filter(Boolean).join(' ')}</strong>
                    {viaje?.colegio && <> del <strong>{viaje.colegio}</strong></>}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Nivel incorrecto.</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Este viaje es para{' '}
                    <strong>{[viaje?.grado, viaje?.nivel_educativo].filter(Boolean).join(' ')}</strong>.
                    {gradoInput && nivelInput && (
                      <> Ingresaste <strong>{gradoInput} {nivelInput}</strong>.</>
                    )}
                    {' '}¿Estás seguro que quieres continuar?
                  </p>
                </div>
              </div>
            )}

            {/* Comparación de datos */}
            {(colegioInput || nivelInput || gradoInput) && viaje && (
              <div className="grid grid-cols-5 gap-3 items-center bg-gray-50 rounded-lg p-4">
                {/* Datos ingresados */}
                <div className="col-span-2 space-y-2">
                  {colegioInput && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
                      </svg>
                      <span>{colegioInput}</span>
                    </div>
                  )}
                  {(nivelInput || gradoInput) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" />
                      </svg>
                      <span>{[gradoInput, nivelInput].filter(Boolean).join(' ')}</span>
                    </div>
                  )}
                </div>

                {/* Flecha */}
                <div className="col-span-1 flex justify-center">
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Datos del viaje */}
                <div className="col-span-2 space-y-2">
                  {viaje.colegio && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0v6" />
                      </svg>
                      <span>{viaje.colegio}</span>
                    </div>
                  )}
                  {(viaje.nivel_educativo || viaje.grado) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" />
                      </svg>
                      <span>{[viaje.grado, viaje.nivel_educativo].filter(Boolean).join(' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleConfirmar}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#0077B6] text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Confirmar inscripción
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => router.push('/app/buscar-viaje')}
                className="w-full py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Buscar otro viaje
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function ValidacionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#0077B6] border-t-transparent rounded-full animate-spin" /></div>}>
      <ValidacionContent />
    </Suspense>
  )
}
