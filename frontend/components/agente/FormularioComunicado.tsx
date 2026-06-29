'use client'
import { useState } from 'react'

interface Comunicado {
  id: string
  titulo: string
  cuerpo: string
  enviado_email: boolean
  fecha_publicacion: string
}

interface FormularioComunicadoProps {
  viajeId: string
  onEnviado: (comunicado: Comunicado) => void
}

export function FormularioComunicado({ viajeId, onEnviado }: FormularioComunicadoProps) {
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!titulo.trim() || !cuerpo.trim()) { setError('Completa el titulo y el cuerpo.'); return }
    setEnviando(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/viajes/${viajeId}/comunicados/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, cuerpo })
      })
      if (!res.ok) throw new Error('Error al enviar')
      const data = await res.json()
      onEnviado(data)
      setTitulo('')
      setCuerpo('')
    } catch {
      setError('Error al enviar el comunicado.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
      <h2 className="font-semibold text-gray-900 mb-4">Nuevo comunicado</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Titulo *</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: Recordatorio documentacion pendiente" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje *</label>
          <textarea value={cuerpo} onChange={e => setCuerpo(e.target.value)} rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Escribe el mensaje que recibiran todos los tutores..." />
        </div>
        {error && <p className="text-red-600 text-xs">{error}</p>}
        <button onClick={handleSubmit} disabled={enviando} className="bg-blue-800 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          {enviando ? 'Enviando a todos los tutores...' : 'Enviar comunicado'}
        </button>
      </div>
    </div>
  )
}