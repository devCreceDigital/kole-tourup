'use client'
import { useState, useEffect } from 'react'
import { ItemNotificacion } from '@/components/padre/ItemNotificacion'

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/v1/notificaciones/')
      .then(r => r.json())
      .then(data => setNotificaciones(data))
      .finally(() => setCargando(false))
  }, [])

  async function marcarLeida(id: string) {
    await fetch(`/api/v1/notificaciones/${id}/`, { method: 'PATCH' })
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  async function marcarTodas() {
    await fetch('/api/v1/notificaciones/marcar-todas/', { method: 'POST' })
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })))
  }

  const noLeidas = notificaciones.filter(n => !n.leida).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
            {noLeidas > 0 && <p className="text-sm text-blue-600 mt-0.5">{noLeidas} sin leer</p>}
          </div>
          {noLeidas > 0 && (
            <button onClick={marcarTodas} className="text-sm text-gray-500 hover:text-gray-700 underline">
              Marcar todo como leido
            </button>
          )}
        </div>
        {cargando ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-4">🔔</p>
            <p className="font-medium">No tienes notificaciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificaciones.map(n => (
              <ItemNotificacion key={n.id} notificacion={n} onMarcarLeida={marcarLeida} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}