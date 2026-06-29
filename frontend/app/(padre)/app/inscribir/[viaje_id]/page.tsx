'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WizardProgress } from '@/components/forms/WizardProgress'
import { Step1 } from './steps/Step1'
import { Step2 } from './steps/Step2'
import { Step3 } from './steps/Step3'

const LABELS = ['Datos basicos', 'Centro educativo', 'Salud y T&C']

export default function InscribirPage({ params }: { params: { viaje_id: string } }) {
  const router = useRouter()
  const [paso, setPaso] = useState(1)
  const [data, setData] = useState<Record<string, string | boolean>>({})
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(field: string, value: string | boolean) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function siguiente() {
    if (paso < 3) setPaso(p => p + 1)
  }

  function anterior() {
    if (paso > 1) setPaso(p => p - 1)
  }

  async function handleSubmit() {
    if (!data.acepta_tyc) {
      setError('Debes aceptar los Terminos y Condiciones.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/inscripciones/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viaje_id: params.viaje_id,
          alumno: {
            nombre: data.nombre,
            apellidos: data.apellidos,
            dni: data.dni,
            fecha_nacimiento: data.fecha_nacimiento,
            necesidades_especiales: data.necesidades_especiales ?? '',
            nombre_tutor_legal: '',
            telefono_emergencia: data.telefono_emergencia ?? '',
          }
        })
      })
      if (!res.ok) throw new Error('Error al inscribir')
      router.push('/app')
    } catch {
      setError('Error al enviar la inscripcion. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Inscripcion al viaje</h1>
        <WizardProgress pasoActual={paso} totalPasos={3} labels={LABELS} />
        <div className="mt-6">
          {paso === 1 && <Step1 data={data as Record<string, string>} onChange={handleChange} />}
          {paso === 2 && <Step2 data={data as Record<string, string>} onChange={handleChange} />}
          {paso === 3 && <Step3 data={data} onChange={handleChange} />}
        </div>
        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
        <div className="flex justify-between mt-8">
          {paso > 1 ? (
            <button onClick={anterior} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Anterior
            </button>
          ) : <div />}
          {paso < 3 ? (
            <button onClick={siguiente} className="px-6 py-2 bg-blue-800 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              Siguiente
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={enviando} className="px-6 py-2 bg-yellow-400 text-gray-900 rounded-lg text-sm font-bold hover:bg-yellow-300 disabled:opacity-50">
              {enviando ? 'Enviando...' : 'Confirmar inscripcion'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}