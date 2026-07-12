'use client'
import { useState } from 'react'
import { FileUploader } from '@/components/forms/FileUploader'
import { fetchApi } from '@/lib/api'

interface Cuota {
  id: string
  numero_cuota: number
  descripcion: string
  importe: number
}

interface FormularioPagoProps {
  inscripcionId: string
  cuotas: Cuota[]
  cuotaIdInicial?: string
  onExito: () => void
}

export function FormularioPago({ inscripcionId, cuotas, cuotaIdInicial, onExito }: FormularioPagoProps) {
  const [cuotaId, setCuotaId] = useState(cuotaIdInicial ?? '')
  const [importe, setImporte] = useState('')
  const [fechaPago, setFechaPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  async function handleSubmit() {
    if (!importe || !fechaPago || !metodoPago) {
      setError('Completa todos los campos obligatorios.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('inscripcion', inscripcionId)
      formData.append('importe', importe)
      formData.append('fecha_pago', fechaPago)
      formData.append('metodo_pago', metodoPago)
      if (cuotaId) formData.append('cuota', cuotaId)
      if (comprobante) formData.append('comprobante', comprobante)
      await fetchApi('/api/v1/pagos/', { method: 'POST', body: formData })
      setExito(true)
      onExito()
    } catch {
      setError('Error al enviar el pago. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (exito) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="font-semibold text-green-800">Pago registrado correctamente</p>
        <p className="text-sm text-green-600 mt-1">Pendiente de revision por el agente</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mt-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Registrar pago</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cuota (opcional)</label>
          <select value={cuotaId} onChange={e => setCuotaId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Sin cuota especifica</option>
            {cuotas.map(c => <option key={c.id} value={c.id}>Cuota {c.numero_cuota}: {c.descripcion} - S/ {c.importe}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Importe (S/) *</label>
            <input type="number" value={importe} onChange={e => setImporte(e.target.value)} min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de pago *</label>
            <input type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Metodo de pago *</label>
          <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Seleccionar</option>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante (opcional)</label>
          <FileUploader onFileSelect={f => setComprobante(f)} />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button onClick={handleSubmit} disabled={enviando} className="w-full bg-blue-800 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
          {enviando ? 'Enviando...' : 'Registrar pago'}
        </button>
      </div>
    </div>
  )
}