interface Step1Props {
  data: Record<string, string>
  onChange: (field: string, value: string) => void
}

export function Step1({ data, onChange }: Step1Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Datos del alumno</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input type="text" value={data.nombre ?? ''} onChange={e => onChange('nombre', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
          <input type="text" value={data.apellidos ?? ''} onChange={e => onChange('apellidos', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DNI / Documento *</label>
          <input type="text" value={data.dni ?? ''} onChange={e => onChange('dni', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento *</label>
          <input type="date" value={data.fecha_nacimiento ?? ''} onChange={e => onChange('fecha_nacimiento', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Genero *</label>
          <select value={data.genero ?? ''} onChange={e => onChange('genero', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Seleccionar</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro / No especificar</option>
          </select>
        </div>
      </div>
    </div>
  )
}