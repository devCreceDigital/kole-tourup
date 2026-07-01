'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { FiltrosInscritos } from './FiltrosInscritos'

interface Inscripcion {
  id: string
  estado: string
  porcentaje_pagado: number
  alumno: { nombre: string; apellidos: string; dni: string }
  padre_tutor: { usuario: { nombre: string; email: string } }
  documentos_resumen: { total_validados: number; total_requeridos: number; tiene_rechazado: boolean }
  grupo?: string
}

interface TablaInscritosProps {
  inscripciones: Inscripcion[]
  viajeId: string
}

const ESTADO_BADGE: Record<string, { variant: 'success' | 'warning' | 'default', icon: string }> = {
  confirmado: { variant: 'success', icon: '✓' },
  pendiente:  { variant: 'warning', icon: '○' },
  cancelado:  { variant: 'default', icon: '✕' },
}

export function TablaInscritos({ inscripciones, viajeId }: TablaInscritosProps) {
  const [filtros, setFiltros] = useState({ estado: '', docs: '', grupo: '' })

  function handleFiltro(key: string, value: string) {
    setFiltros(prev => ({ ...prev, [key]: value }))
  }

  const filtradas = inscripciones.filter(ins => {
    if (filtros.estado && ins.estado !== filtros.estado) return false
    if (filtros.grupo && ins.grupo !== filtros.grupo) return false
    if (filtros.docs === 'completo' && ins.documentos_resumen.total_validados < ins.documentos_resumen.total_requeridos) return false
    if (filtros.docs === 'rechazado' && !ins.documentos_resumen.tiene_rechazado) return false
    return true
  })

  return (
    <div>
      <FiltrosInscritos filtros={filtros} onChange={handleFiltro} />
      <p className="text-xs text-gray-500 mb-3">{filtradas.length} de {inscripciones.length} inscritos</p>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Alumno</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Tutor</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">% Pagado</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Docs</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Grupo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtradas.map(ins => {
              const badge = ESTADO_BADGE[ins.estado] ?? ESTADO_BADGE.pendiente
              const docsOk = ins.documentos_resumen.total_validados >= ins.documentos_resumen.total_requeridos
              return (
                <tr key={ins.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{ins.alumno.nombre} {ins.alumno.apellidos}</p>
                    <p className="text-xs text-gray-400">{ins.alumno.dni}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{ins.padre_tutor?.usuario?.nombre}</p>
                    <p className="text-xs text-gray-400">{ins.padre_tutor?.usuario?.email}</p>
                  </td>
                  <td className="px-4 py-3"><Badge text={ins.estado} icon={badge.icon} variant={badge.variant} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${ins.porcentaje_pagado >= 100 ? 'text-green-700' : ins.porcentaje_pagado > 0 ? 'text-yellow-700' : 'text-red-700'}`}>
                        {ins.porcentaje_pagado}%
                      </span>
                      <div className="w-12 bg-gray-200 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${ins.porcentaje_pagado}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${docsOk ? 'bg-green-100 text-green-800' : ins.documentos_resumen.tiene_rechazado ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {ins.documentos_resumen.total_validados}/{ins.documentos_resumen.total_requeridos}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{ins.grupo ?? '-'}</td>
                  <td className="px-4 py-3 flex gap-3">
                    <Link href={`/backoffice/inscripciones/${ins.id}`} className="text-blue-600 hover:underline text-xs">Ver ficha</Link>
                    <Link href={`/backoffice/chat/${ins.id}`} className="text-blue-600 hover:underline text-xs">Ver chat</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtradas.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No hay inscritos con esos filtros.</div>}
      </div>
    </div>
  )
}