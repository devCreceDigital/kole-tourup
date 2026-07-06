'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/lib/api'
import { Step1 } from '../../inscribir/[viaje_id]/steps/Step1'
import { Step2 } from '../../inscribir/[viaje_id]/steps/Step2'
import { Step3 } from '../../inscribir/[viaje_id]/steps/Step3'

const PASOS = [
  { numero: 1, titulo: 'Datos básicos' },
  { numero: 2, titulo: 'Centro educativo' },
  { numero: 3, titulo: 'Salud y T&C' },
]

export default function NuevoHijoPage() {
  const router = useRouter()
  const [paso, setPaso] = useState(1)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  const [data, setData] = useState<Record<string, any>>({})

  function onChange(field: string, value: any) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  async function finalizar() {
    setError(null)
    setEnviando(true)
    try {
      await fetchApi('/api/v1/inscripciones/alumnos/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setExito(true)
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar al alumno. Revisa los datos.')
    } finally {
      setEnviando(false)
    }
  }

  if (exito) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">¡Hijo/a registrado con éxito!</h2>
        <p className="text-sm text-gray-500 mb-6">
          {data.nombre} {data.apellidos} ha sido registrado correctamente. Ahora puedes buscar un viaje para inscribirlo.
        </p>
        <button
          onClick={() => router.push('/app/buscar-viaje')}
          className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90"
        >
          Buscar viaje escolar
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Registrando tu hijo/a</h1>

      {/* Indicador de progreso */}
      <div className="flex items-center justify-between mb-8">
        {PASOS.map((p, idx) => (
          <div key={p.numero} className="flex-1 flex items-center">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  paso > p.numero
                    ? 'bg-primary border-primary text-white'
                    : paso === p.numero
                    ? 'border-primary text-primary'
                    : 'border-gray-200 text-gray-300'
                }`}
              >
                {paso > p.numero ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : p.numero}
              </div>
              <span className={`text-[11px] font-semibold mt-1.5 ${paso === p.numero ? 'text-primary' : 'text-gray-400'}`}>
                {p.titulo}
              </span>
            </div>
            {idx < PASOS.length - 1 && (
              <div className={`h-0.5 flex-1 -mt-5 ${paso > p.numero ? 'bg-primary' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        {paso === 1 && <Step1 data={data} onChange={onChange} />}
        {paso === 2 && <Step2 data={data} onChange={onChange} />}
        {paso === 3 && <Step3 data={data} onChange={onChange} />}

        {error && <p className="text-xs text-red-600 mt-4">{error}</p>}

        <div className="flex gap-2 pt-6 mt-2 border-t border-gray-100">
          {paso > 1 && (
            <button
              onClick={() => setPaso(p => p - 1)}
              className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Atrás
            </button>
          )}
          {paso < 3 ? (
            <button
              onClick={() => setPaso(p => p + 1)}
              className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={finalizar}
              disabled={enviando}
              className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {enviando ? 'Guardando...' : 'Finalizar registro'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
