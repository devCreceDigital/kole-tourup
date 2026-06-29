interface Step2Props {
  data: Record<string, string>
  onChange: (field: string, value: string) => void
}

const DEPARTAMENTOS = ['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Piura', 'Chiclayo', 'Iquitos', 'Huancayo', 'Otro']

export function Step2({ data, onChange }: Step2Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Centro educativo</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Departamento *</label>
          <select value={data.departamento ?? ''} onChange={e => onChange('departamento', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar</option>
            {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del colegio *</label>
          <input type="text" value={data.colegio ?? ''} onChange={e => onChange('colegio', e.target.value)} placeholder="Escribe el nombre..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nivel educativo *</label>
          <select value={data.nivel ?? ''} onChange={e => onChange('nivel', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar</option>
            <option value="primaria">Primaria</option>
            <option value="secundaria">Secundaria</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Grado *</label>
          <select value={data.grado ?? ''} onChange={e => onChange('grado', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar</option>
            {['1ro', '2do', '3ro', '4to', '5to', '6to'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Validacion inteligente</p>
        <p>Verificaremos que el colegio y grado correspondan al viaje seleccionado.</p>
      </div>
    </div>
  )
}