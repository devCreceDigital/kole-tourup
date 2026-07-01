import { cookies } from 'next/headers'
import Link from 'next/link'
import { ChatInscripcion } from '@/components/chat/ChatInscripcion'
import { decodeJwtPayload } from '@/lib/auth'

export default async function AgenteChatPage({ params }: { params: Promise<{ inscripcion_id: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const payload = token ? decodeJwtPayload(token) : null
  const userId = payload?.user_id || ''

  const { inscripcion_id } = await params

  return (
    <div className="flex flex-col h-full bg-white rounded-[var(--radius-card)] shadow-sm border border-gray-200 overflow-hidden" style={{ minHeight: '600px' }}>
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/backoffice" className="hover:underline">
              Volver al panel
            </Link>
            <span>›</span>
            <span>Chat</span>
          </div>
          <h1 className="font-semibold text-gray-900 text-xl">Chat de la inscripción</h1>
        </div>
      </div>
      <div className="flex-1 flex flex-col h-[500px]">
        <ChatInscripcion inscripcionId={inscripcion_id} usuarioActualId={userId} />
      </div>
    </div>
  )
}
