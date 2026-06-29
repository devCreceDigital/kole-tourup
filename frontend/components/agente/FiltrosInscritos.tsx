'use client'

interface FiltrosInscritosProps {
  filtros: { estado: string; docs: string; grupo: string }
  onChange: (key: string, value: string) => void
}

export function FiltrosInscritos({ filtros, onChange }: FiltrosInscritosProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select value={filtros.estado} onChange={e => onChange('estado', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="confirmado">Confirmado</option>
        <option value="cancelado">Cancelado</option>
      </select>
      <select value={filtros.docs} onChange={e => onChange('docs', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
        <option value="">Todos los docs</option>
        <option value="completo">Completo</option>
        <option value="pendiente">Pendiente</option>
        <option value="rechazado">Con rechazado</option>
      </select>
      <select value={filtros.grupo} onChange={e => onChange('grupo', e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
        <option value="">Todos los grupos</option>
        <option value="A">Grupo A</option>
        <option value="B">Grupo B</option>
        <option value="C">Grupo C</option>
      </select>
    </div>
  )
}