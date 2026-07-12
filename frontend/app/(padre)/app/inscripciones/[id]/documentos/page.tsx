'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { fetchApi } from '@/lib/api'
import { LayoutViajePadre } from '@/components/padre/LayoutViajePadre'

const ESTADO_DOC_CONFIG: Record<string, { label: string; badgeClass: string; icon: string }> = {
  validado: { label: 'Aprobado', badgeClass: 'bg-green-100 text-green-700', icon: 'M5 13l4 4L19 7' },
  pendiente: { label: 'En revision', badgeClass: 'bg-blue-100 text-blue-700', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  rechazado: { label: 'Rechazado', badgeClass: 'bg-red-100 text-red-700', icon: 'M6 18L18 6M6 6l12 12' },
  no_subido: { label: 'Pendiente', badgeClass: 'bg-amber-100 text-amber-700', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
}

export default function DocumentosPage() {
  const params = useParams()
  const id = params.id as string

  const [inscripcion, setInscripcion] = useState<any>(null)
  const [docsData, setDocsData] = useState<any>(null)
  const [cargando, setCargando] = useState(true)

  const [docSeleccionado, setDocSeleccionado] = useState<any>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [errorForm, setErrorForm] = useState<string | null>(null)
  const [exito, setExito] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)

  async function cargarDatos() {
    setCargando(true)
    try {
      const [insData, docs] = await Promise.all([
        fetchApi(`/api/v1/inscripciones/${id}/`),
        fetchApi(`/api/v1/inscripciones/${id}/documentos/`).catch(() => null),
      ])
      setInscripcion(insData)
      setDocsData(docs)
    } catch (e) {
      console.error('Error cargando documentos', e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [id])

  const [eliminando, setEliminando] = useState<string | null>(null)

  async function eliminarDocumento(docId: string) {
    if (!confirm('Seguro que quieres eliminar este documento y volver a subirlo?')) return
    setEliminando(docId)
    try {
      await fetchApi(`/api/v1/documentos/${docId}/eliminar/`, { method: 'DELETE' })
      await cargarDatos()
    } catch (e: any) {
      alert(e?.message || 'No se pudo eliminar el documento.')
    } finally {
      setEliminando(null)
    }
  }

  function abrirModal(doc: any) {
    setDocSeleccionado(doc)
    setArchivo(null)
    setErrorForm(null)
    setExito(false)
  }

  async function enviarDocumento() {
    if (!docSeleccionado || !archivo) return
    setEnviando(true)
    setErrorForm(null)
    try {
      const formData = new FormData()
      formData.append('inscripcion', id)
      formData.append('documento_requerido', docSeleccionado.id)
      formData.append('archivo', archivo)
      await fetchApi('/api/v1/documentos/', {
        method: 'POST',
        body: formData,
        headers: {},
      })
      setExito(true)
      await cargarDatos()
    } catch (e: any) {
      setErrorForm(e?.message || 'No se pudo subir el documento. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (!inscripcion) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">No se pudo cargar la inscripcion.</p>
      </div>
    )
  }

  const layoutProps = {
    inscripcionId: id,
    nombreViaje: inscripcion.viaje.nombre,
    destino: inscripcion.viaje.destino,
    estadoBadge: (inscripcion.estado === 'confirmado' ? 'confirmado' : 'pre_inscrito') as 'confirmado' | 'pre_inscrito',
    nombreAlumno: `${inscripcion.alumno.nombre} ${inscripcion.alumno.apellidos}`,
    imagenUrl: inscripcion.viaje.imagen_url ?? undefined,
  }

  const documentos = docsData?.documentos ?? []
  const totalRequeridos = docsData?.total_requeridos ?? 0
  const totalValidados = docsData?.total_validados ?? 0
  const porcentaje = totalRequeridos > 0 ? Math.round((totalValidados / totalRequeridos) * 100) : 0
  const enRevision = documentos.filter((d: any) => d.estado === 'pendiente').length
  const pendientesAccion = documentos.filter((d: any) => d.estado === 'no_subido' || d.estado === 'rechazado').length

  return (
    <LayoutViajePadre {...layoutProps}>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-start gap-3">
          <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">
              Documentacion - {inscripcion.viaje.nombre}
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">{inscripcion.alumno.nombre} {inscripcion.alumno.apellidos}</p>
          </div>
        </div>

        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Progreso de documentacion</span>
            <span className="text-gray-900 text-xs font-bold">{totalValidados}/{totalRequeridos} aprobados</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${porcentaje}%` }} />
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {totalValidados} aprobados
            </span>
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {enRevision} en revision
            </span>
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {pendientesAccion} pendientes
            </span>
          </div>
        </div>

        {pendientesAccion > 0 && (
          <div className="bg-amber-50 border-b border-amber-100 px-5 py-3 flex items-center gap-2 text-sm text-amber-800">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              Accion requerida: tienes {pendientesAccion} documento{pendientesAccion > 1 ? 's' : ''} pendiente{pendientesAccion > 1 ? 's' : ''} de subir. Por favor subelo{pendientesAccion > 1 ? 's' : ''} antes del plazo para no perder la plaza en el viaje.
            </span>
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {documentos.map((doc: any) => {
            const config = ESTADO_DOC_CONFIG[doc.estado] ?? ESTADO_DOC_CONFIG.no_subido
            return (
              <div key={doc.id}>
                <button
                  type="button"
                  onClick={() => setExpandido(expandido === doc.id ? null : doc.id)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex items-center gap-2">
                      {doc.obligatorio && (
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
                          Obligatorio
                        </span>
                      )}
                      <h3 className="font-bold text-gray-900 text-sm">{doc.nombre}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${config.badgeClass}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
                      </svg>
                      {config.label}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandido === doc.id ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expandido === doc.id && (
                  <div className="px-5 pb-5 pl-13">
                    <p className="text-gray-500 text-xs mb-2">{doc.descripcion}</p>
                    {doc.nombre_archivo && (
                      <p className="text-primary text-xs mb-2 font-medium">{doc.nombre_archivo}</p>
                    )}
                    {doc.motivo_rechazo && (
                      <p className="text-red-600 text-xs mb-3 bg-red-50 rounded px-2 py-1.5">
                        {doc.motivo_rechazo}
                      </p>
                    )}
                    {(doc.estado === 'no_subido' || doc.estado === 'rechazado') && (
                      <button
                        onClick={() => abrirModal(doc)}
                        className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                      >
                        {doc.estado === 'rechazado' ? 'Volver a subir' : 'Subir documento'}
                      </button>
                    )}
                    {doc.estado === 'pendiente' && doc.entrega_id && (
                      <button
                        onClick={() => eliminarDocumento(doc.entrega_id)}
                        disabled={eliminando === doc.entrega_id}
                        className="text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap ml-2 disabled:opacity-50"
                      >
                        {eliminando === doc.entrega_id ? 'Eliminando...' : 'Eliminar y reintentar'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {docSeleccionado && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            {exito ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Documento subido</h3>
                <p className="text-sm text-gray-500 mb-5">Tu documento quedo en revision. La agencia lo validara pronto.</p>
                <button
                  onClick={() => setDocSeleccionado(null)}
                  className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-gray-900 mb-1">
                  {docSeleccionado.estado === 'rechazado' ? 'Volver a subir documento' : 'Subir documento'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{docSeleccionado.nombre}</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Archivo</label>
                    <input
                      type="file"
                      accept={Array.isArray(docSeleccionado.formatos_permitidos) ? docSeleccionado.formatos_permitidos.map((f: string) => `.${f.trim()}`).join(',') : (typeof docSeleccionado.formatos_permitidos === 'string' ? docSeleccionado.formatos_permitidos.split(',').map((f: string) => `.${f.trim()}`).join(',') : '.pdf,.jpg,.jpeg,.png')}
                      onChange={e => setArchivo(e.target.files?.[0] ?? null)}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 file:cursor-pointer cursor-pointer"
                    />
                    {docSeleccionado.formatos_permitidos && docSeleccionado.formatos_permitidos.length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-1">Formatos permitidos: {Array.isArray(docSeleccionado.formatos_permitidos) ? docSeleccionado.formatos_permitidos.join(', ') : docSeleccionado.formatos_permitidos}</p>
                    )}
                  </div>

                  {errorForm && <p className="text-xs text-red-600">{errorForm}</p>}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setDocSeleccionado(null)}
                      className="flex-1 border border-gray-200 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={enviarDocumento}
                      disabled={enviando || !archivo}
                      className="flex-1 bg-primary text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                    >
                      {enviando ? 'Subiendo...' : 'Subir'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </LayoutViajePadre>
  )
}
