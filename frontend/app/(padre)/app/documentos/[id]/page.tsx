import { ChecklistDocumentos } from '@/components/padre/ChecklistDocumentos'

async function getData(id: string) {
  const [insRes, docsRes] = await Promise.all([
    fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/inscripciones/${id}/`, { cache: 'no-store' }),
    fetch(`${(process.env.NEXT_PUBLIC_GATEWAY_INTERNAL_URL || process.env.NEXT_PUBLIC_GATEWAY_URL)}/api/v1/documentos/?inscripcion_id=${id}`, { cache: 'no-store' }),
  ])
  const inscripcion = insRes.ok ? await insRes.json() : null
  const documentos = docsRes.ok ? await docsRes.json() : []
  return { inscripcion, documentos }
}

export default async function DocumentosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { inscripcion, documentos } = await getData(id)
  if (!inscripcion) return <div className="p-12 text-center text-gray-500">Inscripcion no encontrada.</div>

  const docsRequeridos = inscripcion.viaje?.documentos_requeridos ?? []
  const docsConEntrega = docsRequeridos.map((dr: any) => ({
    ...dr,
    entrega_actual: documentos.find((d: any) => d.documento_requerido === dr.id && d.estado !== 'rechazado') ?? null
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{inscripcion.viaje?.nombre}</h1>
        <p className="text-sm text-gray-500 mb-6">Documentacion requerida</p>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <ChecklistDocumentos inscripcionId={id} documentos={docsConEntrega} onSubido={() => {}} />
        </div>
      </div>
    </div>
  )
}