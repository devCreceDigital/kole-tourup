import { ChatInscripcion } from '@/components/chat/ChatInscripcion'

export default function ChatPage({ params }: { params: Promise<{ inscripcion_id: string }> }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-3">
        <h1 className="font-semibold text-gray-900">Chat con la agencia</h1>
        <p className="text-xs text-gray-500">Mensajes en tiempo real</p>
      </div>
      <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        <ChatInscripcion inscripcionId={params.inscripcion_id} usuarioActualId="" />
      </div>
    </div>
  )
}