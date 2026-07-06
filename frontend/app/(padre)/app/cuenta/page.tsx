'use client'

import { useEffect, useState } from 'react'
import { fetchApi } from '@/lib/api'

export default function CuentaPage() {
  const [usuario, setUsuario] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetchApi('/api/v1/auth/me/')
      .then(setUsuario)
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  if (cargando) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (!usuario) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">No se pudo cargar tu cuenta.</p>
      </div>
    )
  }

  const iniciales = `${usuario.nombre?.[0] ?? ''}${usuario.apellidos?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-10">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Mi cuenta</h1>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 flex items-center gap-4 border-b border-gray-100">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
            {iniciales}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base">{usuario.nombre} {usuario.apellidos}</p>
            <p className="text-gray-400 text-xs mt-0.5">{usuario.email}</p>
          </div>
        </div>

        <div className="px-6">
          <div className="flex justify-between items-center py-3 border-b border-gray-50">
            <span className="text-gray-400 text-xs font-medium">Nombre</span>
            <span className="text-gray-900 text-sm font-semibold">{usuario.nombre}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-50">
            <span className="text-gray-400 text-xs font-medium">Apellidos</span>
            <span className="text-gray-900 text-sm font-semibold">{usuario.apellidos}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-50">
            <span className="text-gray-400 text-xs font-medium">Email</span>
            <span className="text-gray-900 text-sm font-semibold">{usuario.email}</span>
          </div>
          <div className="flex justify-between items-center py-3 last:border-0">
            <span className="text-gray-400 text-xs font-medium">Tipo de cuenta</span>
            <span className="text-gray-900 text-sm font-semibold capitalize">{usuario.rol}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
