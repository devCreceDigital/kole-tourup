'use client'
import { useState, useEffect } from 'react'
import { fetchApi } from '@/lib/api'

interface Preferencias {
  canal_preferido: string
  horario_inicio: string
  horario_fin: string
  max_por_dia: number
  recibir_recordatorios: boolean
  recibir_comunicados: boolean
  recibir_alertas_docs: boolean
}

export default function ConfiguracionNotificacionesPage() {
  const [prefs, setPrefs] = useState<Preferencias>({
    canal_preferido: 'email',
    horario_inicio: '08:00',
    horario_fin: '21:00',
    max_por_dia: 5,
    recibir_recordatorios: true,
    recibir_comunicados: true,
    recibir_alertas_docs: true,
  })
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  useEffect(() => {
    fetchApi('/api/v1/notificaciones/preferencias/')
      .then(data => { setPrefs(data); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  async function handleGuardar() {
    setGuardando(true)
    setExito(false)
    await fetchApi('/api/v1/notificaciones/preferencias/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs)
    })
    setGuardando(false)
    setExito(true)
    setTimeout(() => setExito(false), 3000)
  }

  if (cargando) return <div className="p-8 text-gray-400">Cargando...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Preferencias de notificacion</h1>
        <p className="text-sm text-gray-500 mb-6">Configura como y cuando quieres recibir notificaciones</p>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Canal preferido</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'email', label: '📧 Email' },
                { value: 'push', label: '🔔 Notificacion push' },
                { value: 'ambos', label: '📧🔔 Email y Push' },
                { value: 'ninguno', label: '🔕 No recibir' },
              ].map(op => (
                <button key={op.value} onClick={() => setPrefs(p => ({ ...p, canal_preferido: op.value }))}
                  className={`border rounded-lg px-4 py-3 text-sm font-medium text-left transition-colors ${prefs.canal_preferido === op.value ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Horario de notificaciones</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <input type="time" value={prefs.horario_inicio} onChange={e => setPrefs(p => ({ ...p, horario_inicio: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <input type="time" value={prefs.horario_fin} onChange={e => setPrefs(p => ({ ...p, horario_fin: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Maximo por dia</label>
            <select value={prefs.max_por_dia} onChange={e => setPrefs(p => ({ ...p, max_por_dia: Number(e.target.value) }))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {[1, 3, 5, 10].map(n => <option key={n} value={n}>{n} notificaciones</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Tipos de notificacion</label>
            <div className="space-y-3">
              {[
                { key: 'recibir_recordatorios', label: 'Recordatorios de pago', desc: 'Avisos antes de que venza una cuota' },
                { key: 'recibir_comunicados', label: 'Comunicados de la agencia', desc: 'Mensajes generales del organizador del viaje' },
                { key: 'recibir_alertas_docs', label: 'Alertas de documentacion', desc: 'Documentos rechazados o pendientes' },
              ].map(item => (
                <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={prefs[item.key as keyof Preferencias] as boolean}
                    onChange={e => setPrefs(p => ({ ...p, [item.key]: e.target.checked }))}
                    className="mt-0.5 rounded border-gray-300 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button onClick={handleGuardar} disabled={guardando} className="bg-blue-800 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar preferencias'}
            </button>
            {exito && <p className="text-green-600 text-sm">✓ Preferencias guardadas</p>}
          </div>
        </div>
      </div>
    </div>
  )
}