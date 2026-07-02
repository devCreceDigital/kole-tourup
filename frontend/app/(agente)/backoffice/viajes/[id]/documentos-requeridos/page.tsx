'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface DocRequerido { id: string; nombre: string; obligatorio: boolean; formatos_permitidos: string }

export default function DocumentosRequeridosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: viajeId } = use(params)
  const [docs, setDocs] = useState<DocRequerido[]>([])
  const [form, setForm] = useState({ nombre: '', obligatorio: true, formatos_permitidos: 'pdf,jpg,png' })
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/documentos-requeridos/`, { credentials: 'include' }).then(r => r.json()).then(setDocs)
  }, [viajeId])

  async function crearDoc() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/documentos-requeridos/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, viaje: viajeId })
    })
    if (res.ok) { const d = await res.json(); setDocs(prev => [...prev, d]); setForm({ nombre: '', obligatorio: true, formatos_permitidos: 'pdf,jpg,png' }); setMostrarForm(false) }
  }

  async function eliminarDoc(id: string) {
    await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/documentos-requeridos/${id}/`, { method: 'DELETE', credentials: 'include' })
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href={`/backoffice/viajes/${viajeId}`} className="hover:underline">Viaje</Link>
        <span>›</span><span>Documentos requeridos</span>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documentos requeridos</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Agregar documento</button>
      </div>
      {mostrarForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-3">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label><input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Ej: DNI del alumno" /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Formatos permitidos</label><input value={form.formatos_permitidos} onChange={e => setForm(p => ({...p, formatos_permitidos: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.obligatorio} onChange={e => setForm(p => ({...p, obligatorio: e.target.checked}))} /><span className="text-sm text-gray-700">Obligatorio</span></label>
          <div className="flex gap-2">
            <button onClick={crearDoc} disabled={!form.nombre} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Guardar</button>
            <button onClick={() => setMostrarForm(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {docs.map(doc => (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{doc.nombre} {doc.obligatorio && <span className="text-red-500 text-xs">*</span>}</p>
              <p className="text-xs text-gray-400 mt-0.5">Formatos: {doc.formatos_permitidos}</p>
            </div>
            <button onClick={() => eliminarDoc(doc.id)} className="text-red-400 hover:text-red-600 text-xs">Eliminar</button>
          </div>
        ))}
        {docs.length === 0 && !mostrarForm && <p className="text-gray-400 text-sm">No hay documentos requeridos.</p>}
      </div>
    </div>
  )
}