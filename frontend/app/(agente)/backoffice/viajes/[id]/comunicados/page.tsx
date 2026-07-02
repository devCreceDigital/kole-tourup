'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { FormularioComunicado } from '@/components/agente/FormularioComunicado'

interface Comunicado {
  id: string
  titulo: string
  cuerpo: string
  enviado_email: boolean
  fecha_publicacion: string
}

export default function ComunicadosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [comunicados, setComunicados] = useState<Comunicado[]>([])

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${id}/comunicados/`, { credentials: 'include' }).then(r => r.json()).then(data => setComunicados(Array.isArray(data) ? data : data.results ?? []))
  }, [id])

  function handleEnviado(comunicado: Comunicado) {
    setComunicados(prev => [comunicado, ...prev])
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href={`/backoffice/viajes/${id}`} className="hover:underline">Viaje</Link>
        <span>›</span><span>Comunicados</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Comunicados masivos</h1>
      <FormularioComunicado viajeId={id} onEnviado={handleEnviado} />
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Comunicados anteriores</h2>
        {comunicados.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay comunicados enviados aun.</p>
        ) : (
          <div className="space-y-3">
            {comunicados.map(c => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-gray-900 text-sm">{c.titulo}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.enviado_email ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {c.enviado_email ? '✓ Enviado' : '⏳ Enviando...'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{c.cuerpo}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(c.fecha_publicacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}