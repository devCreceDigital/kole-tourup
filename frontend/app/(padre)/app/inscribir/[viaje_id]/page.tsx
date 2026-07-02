'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { WizardProgress } from '@/components/forms/WizardProgress'
import { Step1 } from './steps/Step1'
import { Step2 } from './steps/Step2'
import { Step3 } from './steps/Step3'
import { fetchApi, ApiError } from '@/lib/api'

const LABELS = ['Datos básicos', 'Centro educativo', 'Salud y T&C']

const ALLERGEN_MAP: Record<string, string> = {
  'gluten': 'alergeno_gluten',
  'crustaceos': 'alergeno_crustaceos',
  'huevos': 'alergeno_huevos',
  'pescado': 'alergeno_pescado',
  'cacahuetes': 'alergeno_cacahuetes',
  'soja': 'alergeno_soja',
  'lacteos': 'alergeno_lacteos',
  'frutos de cascara': 'alergeno_frutos_cascara',
  'apio': 'alergeno_apio',
  'mostaza': 'alergeno_mostaza',
  'sesamo': 'alergeno_sesamo',
  'sulfitos': 'alergeno_sulfitos',
  'altramuces': 'alergeno_altramuces',
  'moluscos': 'alergeno_moluscos'
}

function InscribirForm() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const viaje_id = params.viaje_id as string
  const [paso, setPaso] = useState(searchParams.get('success') === 'true' ? 4 : 1)
  const [data, setData] = useState<Record<string, string | boolean>>({})
  const [viaje, setViaje] = useState<any>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Smart validation overlay states
  const [showValidation, setShowValidation] = useState(false)
  const [validationType, setValidationType] = useState<'correct' | 'colegio_incorrecto' | 'nivel_incorrecto' | null>(null)

  // 1. Cargar viaje al montar
  useEffect(() => {
    async function fetchViaje() {
      try {
        const res = await fetchApi(`/api/v1/viajes/publico/${viaje_id}/`)
        if (res) {
          setViaje(res)
        }
      } catch (e) {
        console.error('Error cargando viaje:', e)
      }
    }
    fetchViaje()
  }, [viaje_id])

  // 2. Persistencia temporal (cargar de localStorage al montar)
  useEffect(() => {
    const key = `inscripcion_progreso_${viaje_id}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        setData(JSON.parse(saved))
      } catch (e) {
        console.error('Error al parsear el progreso guardado:', e)
      }
    }
  }, [viaje_id])

  function handleChange(field: string, value: string | boolean) {
    setData(prev => {
      const next = { ...prev, [field]: value }
      const key = `inscripcion_progreso_${viaje_id}`
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }

  function validatePaso1() {
    if (!data.nombre || !String(data.nombre).trim()) return 'El nombre del alumno es obligatorio.'
    if (!data.apellidos || !String(data.apellidos).trim()) return 'Los apellidos del alumno son obligatorios.'
    if (!data.dni || !String(data.dni).trim()) return 'El DNI o documento es obligatorio.'
    if (!data.fecha_nacimiento) return 'La fecha de nacimiento es obligatoria.'
    if (!data.genero) return 'El género es obligatorio.'
    return null
  }

  function validatePaso2() {
    if (!data.departamento) return 'El departamento es obligatorio.'
    if (!data.colegio || !String(data.colegio).trim()) return 'El nombre del colegio es obligatorio.'
    if (!data.nivel) return 'El nivel educativo es obligatorio.'
    if (!data.grado) return 'El grado es obligatorio.'
    return null
  }

  function anterior() {
    if (paso > 1) {
      setError(null)
      setPaso(p => p - 1)
    }
  }

  function siguiente() {
    setError(null)

    if (paso === 1) {
      const err = validatePaso1()
      if (err) {
        setError(err)
        return
      }
      setPaso(2)
    } else if (paso === 2) {
      const err = validatePaso2()
      if (err) {
        setError(err)
        return
      }

      // Validación inteligente
      if (viaje) {
        const viajeColegio = viaje.colegio ? viaje.colegio.trim().toLowerCase() : ''
        const viajeNivel = viaje.nivel_educativo ? viaje.nivel_educativo.trim().toLowerCase() : ''
        const viajeGrado = viaje.grado ? viaje.grado.trim().toLowerCase() : ''

        const inputColegio = data.colegio ? String(data.colegio).trim().toLowerCase() : ''
        const inputNivel = data.nivel ? String(data.nivel).trim().toLowerCase() : ''
        const inputGrado = data.grado ? String(data.grado).trim().toLowerCase() : ''

        const matchColegio = !viajeColegio || inputColegio === viajeColegio
        const matchNivel = !viajeNivel || inputNivel === viajeNivel
        const matchGrado = !viajeGrado || inputGrado === viajeGrado

        if (!matchColegio) {
          setValidationType('colegio_incorrecto')
          setShowValidation(true)
        } else if (!matchNivel || !matchGrado) {
          setValidationType('nivel_incorrecto')
          setShowValidation(true)
        } else {
          setValidationType('correct')
          setShowValidation(true)
          setTimeout(() => {
            setShowValidation(false)
            setValidationType(null)
            setPaso(3)
          }, 2000)
        }
      } else {
        // Fallback si no carga el viaje
        setPaso(3)
      }
    }
  }

  async function handleSubmit() {
    if (!data.acepta_tyc) {
      setError('Debes aceptar los Términos y Condiciones.')
      return
    }
    setEnviando(true)
    setError(null)

    // Construir mapeo de alérgenos
    const alergenosPayload: Record<string, boolean> = {}
    Object.keys(ALLERGEN_MAP).forEach(rawName => {
      const keyInState = `alergeno_${rawName}`
      const keyInPayload = ALLERGEN_MAP[rawName]
      alergenosPayload[keyInPayload] = !!data[keyInState]
    })

    const payload = {
      viaje_id: viaje_id,
      alumno: {
        nombre: data.nombre,
        apellidos: data.apellidos,
        dni: data.dni,
        fecha_nacimiento: data.fecha_nacimiento,
        genero: data.genero,
        colegio: data.colegio,
        departamento: data.departamento,
        nivel_educativo: data.nivel,
        grado: data.grado,
        necesidades_especiales: data.necesidades_especiales ?? '',
        nombre_tutor_legal: '',
        telefono_emergencia: data.telefono_emergencia ?? '',
        ...alergenosPayload
      }
    }

    try {
      await fetchApi('/api/v1/inscripciones/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      // Éxito: NO limpiar localStorage de progreso aún para que la vista de éxito pueda leerlo.
      // Solo limpiamos si el usuario hace clic en "Volver al inicio"
      setPaso(4)
    } catch (err: any) {
      setError(err.message || 'Error al enviar la inscripción. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8 relative overflow-hidden">
        
        {/* Smart Validation Modal/Overlay */}
        {showValidation && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-center animate-fade-in">
            {validationType === 'correct' && (
              <div className="space-y-4 max-w-md">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">✓</div>
                <h3 className="text-xl font-bold text-gray-900">¡Validación Correcta!</h3>
                <p className="text-sm text-gray-600">
                  ¡Perfecto! Este viaje corresponde a los alumnos de <strong>{viaje?.grado} {viaje?.nivel_educativo}</strong> de <strong>{viaje?.colegio}</strong>.
                </p>
                <p className="text-xs text-gray-400">Avanzando al siguiente paso...</p>
              </div>
            )}

            {validationType === 'colegio_incorrecto' && (
              <div className="space-y-6 max-w-md">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">✕</div>
                <h3 className="text-xl font-bold text-rose-700">Colegio no admitido</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Este viaje es de carácter exclusivo para los alumnos del colegio <strong>{viaje?.colegio}</strong>.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={() => router.push('/app')}
                    className="w-full py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                  >
                    Buscar viajes para mi colegio
                  </button>
                  <button 
                    onClick={() => setShowValidation(false)}
                    className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Corregir mis datos
                  </button>
                </div>
              </div>
            )}

            {validationType === 'nivel_incorrecto' && (
              <div className="space-y-6 max-w-md">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">!</div>
                <h3 className="text-xl font-bold text-amber-700">Incompatibilidad de grado/nivel</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Este viaje está programado para alumnos de <strong>{viaje?.grado} {viaje?.nivel_educativo}</strong>, pero has ingresado <strong>{data.grado} {data.nivel}</strong>.
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button 
                    onClick={() => {
                      setShowValidation(false)
                      setValidationType(null)
                      setPaso(3)
                    }}
                    className="w-full py-2.5 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600"
                  >
                    Continuar de todas formas
                  </button>
                  <button 
                    onClick={() => router.push('/app')}
                    className="w-full py-2.5 bg-blue-800 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                  >
                    Buscar viaje para este alumno
                  </button>
                  <button 
                    onClick={() => setShowValidation(false)}
                    className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Corregir mis datos
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {paso < 4 && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Registrando tu hijo/a</h1>
            <WizardProgress pasoActual={paso} totalPasos={3} labels={LABELS} />

            <div className="mt-6">
              {paso === 1 && <Step1 data={data as Record<string, string>} onChange={handleChange} />}
              {paso === 2 && <Step2 data={data as Record<string, string>} onChange={handleChange} />}
              {paso === 3 && <Step3 data={data} onChange={handleChange} />}
            </div>

            {error && (
              <p className="text-red-600 text-sm mt-4 font-medium bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            {/* Botones de navegación — fiel al mockup */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
              {paso > 1 ? (
                <button
                  onClick={anterior}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Atrás
                </button>
              ) : <div />}

              {paso < 3 ? (
                <button
                  onClick={siguiente}
                  className="px-6 py-2.5 bg-[#0077B6] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  Continuar
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={enviando}
                  className="px-6 py-2.5 bg-[#0077B6] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {enviando ? 'Enviando...' : 'Finalizar Inscripción'}
                </button>
              )}
            </div>
          </>
        )}

        {paso === 4 && (
          <div className="flex flex-col items-center justify-center text-center py-6 px-4 animate-fade-in">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-emerald-500 text-4xl font-bold">check</span>
            </div>
            <h1 className="text-3xl font-bold text-blue-800 mb-4 tracking-tight">¡Inscripción completada con éxito!</h1>
            <p className="text-gray-700 mb-8 max-w-sm">
              {data.nombre} {data.apellidos} ha sido registrado correctamente.
              Ahora puedes proceder a gestionar su viaje desde el panel principal.
            </p>

            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-6 text-left mb-8 space-y-2 relative overflow-hidden">
              <p className="text-sm text-gray-800"><span className="font-bold text-gray-900">Alumno:</span> {data.nombre} {data.apellidos}</p>
              <p className="text-sm text-gray-800"><span className="font-bold text-gray-900">Centro:</span> {data.colegio || (viaje?.colegio)}</p>
              <div className="pt-3">
                <button className="text-sm text-blue-700 font-medium hover:text-blue-800 hover:underline flex items-center gap-1">
                  Descargar justificante de inscripción (PDF)
                </button>
              </div>
            </div>

            <div className="w-full space-y-4">
              <button 
                onClick={() => {
                  localStorage.removeItem(`inscripcion_progreso_${viaje_id}`)
                  router.push('/app')
                }}
                className="w-full py-3.5 bg-blue-700 text-white rounded-lg text-base font-semibold hover:bg-blue-800 shadow-md transition-all hover:-translate-y-0.5"
              >
                Volver al Inicio
              </button>
              
              <button className="w-full py-2 text-sm text-blue-700 font-medium hover:text-blue-800 hover:underline">
                Configurar preferencias de habitación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { Suspense } from 'react'

export default function InscribirPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Cargando...</div>}>
      <InscribirForm />
    </Suspense>
  )
}