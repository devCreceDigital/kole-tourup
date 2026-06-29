'use client'
import { useState } from 'react'
import { FileUploader } from '@/components/forms/FileUploader'

interface EntregaActual {
  id: string
  estado: 'pendiente' | 'validado' | 'rechazado'
  nombre_archivo?: string
  uploaded_at?: string
  motivo_rechazo?: string
}

interface ItemDocumentoProps {
  inscripcionId: string
  documentoRequeridoId: string
  nombre: string
  obligatorio: boolean
  formatosPermitidos: string
  entregaActual?: EntregaActual
  onSubido: () => void
}

function getEstado(entrega?: EntregaActual): 'sin_subir' | 'revision' | 'validado' | 'rechazado' {
  if (!entrega) return 'sin_subir'
  if (entrega.estado === 'validado') return 'validado'
  if (entrega.estado === 'rechazado') return 'rechazado'
  if (entrega.nombre_archivo) return 'revision'
  return 'sin_subir'
}

const ESTADO_UI = {
  sin_subir: { color: 'border-gray-200 bg-white', badge: 'bg-gray-100 text-gray-600', label: 'Sin subir', icon: '○' },
  revision:  { color: 'border-yellow-200 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800', label: 'En revision', icon: '⏳' },
  validado:  { color: 'border-green-200 bg-green-50', badge: 'bg-green-100 text-green-800', label: 'Validado', icon: '✓' },
  rechazado: { color: 'border-red-200 bg-red-50', badge: 'bg-red-100 text-red-800', label: 'Rechazado', icon: '✕' },
}

export function ItemDocumento({ inscripcionId, documentoRequeridoId, nombre, obligatorio, formatosPermitidos, entregaActual, onSubido }: ItemDocumentoProps) {
  const estado = getEstado(entregaActual)
  const ui = ESTADO_UI[estado]
  const [mostrarUploader, setMostrarUploader] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function handleSubir(file: File) {
    setEnviando(true)
    const formData = new FormData()
    formData.append('inscripcion', inscripcionId)
    formData.append('documento_requerido', documentoRequeridoId)
    formData.append('archivo', file)
    try {
      await fetch('/api/v1/documentos/', { method: 'POST', body: formData })
      setMostrarUploader(false)
      onSubido()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className={`border rounded-xl p-4 ${ui.color}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm text-gray-900">{nombre} {obligatorio && <span className="text-red-500">*</span>}</p>
          <p className="text-xs text-gray-400 mt-0.5">Formatos: {formatosPermitidos}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ui.badge}`}>{ui.icon} {ui.label}</span>
      </div>
      {entregaActual?.nombre_archivo && (
        <p className="text-xs text-gray-500 mb-2">Archivo: {entregaActual.nombre_archivo}</p>
      )}
      {estado === 'rechazado' && entregaActual?.motivo_rechazo && (
        <div className="bg-red-100 border border-red-200 rounded p-2 mb-3 text-xs text-red-800">
          <p className="font-semibold">Motivo de rechazo:</p>
          <p>{entregaActual.motivo_rechazo}</p>
        </div>
      )}
      {(estado === 'sin_subir' || estado === 'rechazado') && (
        <button onClick={() => setMostrarUploader(!mostrarUploader)} className="text-xs text-blue-600 underline mt-1">
          {estado === 'rechazado' ? 'Volver a subir' : 'Subir documento'}
        </button>
      )}
      {mostrarUploader && (
        <div className="mt-3">
          <FileUploader onFileSelect={handleSubir} uploading={enviando} />
        </div>
      )}
    </div>
  )
}