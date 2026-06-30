import Link from 'next/link'

export default function ExportarPage({ params }: { params: Promise<{ id: string }> }) {
  const base = `/api/v1/viajes/${params.id}`

  return (
    <div className="p-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href={`/backoffice/viajes/${params.id}`} className="hover:underline">Viaje</Link>
        <span>›</span><span>Exportar</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Exportaciones</h1>

      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Inscritos</h2>
          <p className="text-sm text-gray-500 mb-4">Lista completa de alumnos inscritos con datos de tutor y estado</p>
          <div className="flex gap-3">
            <a href={`${base}/exportar/inscritos/?formato=csv`} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              Descargar CSV
            </a>
            <a href={`${base}/exportar/inscritos/?formato=xlsx`} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Descargar Excel
            </a>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Pagos</h2>
          <p className="text-sm text-gray-500 mb-4">Historial de pagos registrados con importes y estados</p>
          <div className="flex gap-3">
            <a href={`${base}/exportar/pagos/?formato=csv`} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              Descargar CSV
            </a>
            <a href={`${base}/exportar/pagos/?formato=xlsx`} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Descargar Excel
            </a>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Documentacion</h2>
          <p className="text-sm text-gray-500 mb-4">Estado de documentos entregados por cada alumno</p>
          <div className="flex gap-3">
            <a href={`${base}/exportar/documentacion/?formato=csv`} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              Descargar CSV
            </a>
            <a href={`${base}/exportar/documentacion/?formato=xlsx`} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Descargar Excel
            </a>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Informe de estado</h2>
          <p className="text-sm text-gray-500 mb-4">PDF con metricas del viaje y lista completa de inscritos</p>
          <a href={`${base}/exportar/informe-pdf/`} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 inline-block">
            Descargar PDF
          </a>
        </div>
      </div>
    </div>
  )
}