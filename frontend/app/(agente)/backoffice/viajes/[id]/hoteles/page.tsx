'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'

interface Hotel { id: string; nombre: string; estrellas: number; web_url?: string; maps_url?: string }

export default function HotelesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: viajeId } = use(params)
  const [hoteles, setHoteles] = useState<Hotel[]>([])
  const [form, setForm] = useState({ nombre: '', estrellas: '3', web_url: '', maps_url: '' })
  const [creando, setCreando] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/hoteles/`, { credentials: 'include' }).then(r => r.json()).then(setHoteles)
  }, [viajeId])

  async function crearHotel() {
    setCreando(true)
    const res = await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/hoteles/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, estrellas: Number(form.estrellas), viaje: viajeId })
    })
    if (res.ok) { const h = await res.json(); setHoteles(prev => [...prev, h]); setForm({ nombre: '', estrellas: '3', web_url: '', maps_url: '' }); setMostrarForm(false) }
    setCreando(false)
  }

  async function eliminarHotel(id: string) {
    await fetch(`${process.env.NEXT_PUBLIC_GATEWAY_URL}/api/v1/viajes/${viajeId}/hoteles/${id}/`, { method: 'DELETE', credentials: 'include' })
    setHoteles(prev => prev.filter(h => h.id !== id))
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href={`/backoffice/viajes/${viajeId}`} className="hover:underline">Viaje</Link>
        <span>›</span><span>Hoteles</span>
      </div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alojamiento</h1>
        <button onClick={() => setMostrarForm(!mostrarForm)} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Agregar hotel</button>
      </div>
      {mostrarForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Nombre *</label><input value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Estrellas</label><select value={form.estrellas} onChange={e => setForm(p => ({...p, estrellas: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}★</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Web URL</label><input value={form.web_url} onChange={e => setForm(p => ({...p, web_url: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="https://..." /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Google Maps URL</label><input value={form.maps_url} onChange={e => setForm(p => ({...p, maps_url: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="https://maps.google.com/..." /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={crearHotel} disabled={creando || !form.nombre} className="bg-blue-800 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">Guardar</button>
            <button onClick={() => setMostrarForm(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {hoteles.map(hotel => (
          <div key={hotel.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{hotel.nombre} <span className="text-yellow-500">{'★'.repeat(hotel.estrellas)}</span></p>
              <div className="flex gap-3 mt-1">
                {hotel.web_url && <a href={hotel.web_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Web</a>}
                {hotel.maps_url && <a href={hotel.maps_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Maps</a>}
              </div>
            </div>
            <button onClick={() => eliminarHotel(hotel.id)} className="text-red-400 hover:text-red-600 text-xs">Eliminar</button>
          </div>
        ))}
        {hoteles.length === 0 && !mostrarForm && <p className="text-gray-400 text-sm">No hay hoteles asignados.</p>}
      </div>
    </div>
  )
}