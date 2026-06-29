import Image from 'next/image'
import Link from 'next/link'

interface HeroSectionProps {
  nombre: string
  destino: string
  fechaSalida: string
  fechaRegreso: string
  cupoMaximo: number
  cupoDisponible: number
  imagenUrl?: string
  inscribirHref: string
}

export function HeroSection({ nombre, destino, fechaSalida, fechaRegreso, cupoMaximo, cupoDisponible, imagenUrl, inscribirHref }: HeroSectionProps) {
  return (
    <section className="relative w-full h-[70vh] min-h-[450px] flex items-end">
      <div className="absolute inset-0 bg-blue-900">
        {imagenUrl && <Image src={imagenUrl} alt={nombre} fill className="object-cover opacity-50" priority />}
      </div>
      <div className="relative z-10 w-full px-6 pb-12 text-white max-w-5xl mx-auto">
        <p className="text-xs font-bold tracking-widest uppercase text-yellow-400 mb-2">PROXIMA EXPEDICION 2026</p>
        <h1 className="text-4xl md:text-5xl font-bold uppercase mb-3">{nombre}</h1>
        <p className="text-base text-gray-200 mb-2">{destino} · {fechaSalida} al {fechaRegreso}</p>
        <p className="text-sm text-gray-300 mb-6">Plazas disponibles: {cupoDisponible} de {cupoMaximo}</p>
        <div className="flex flex-wrap gap-4">
          <Link href={inscribirHref} className="bg-yellow-400 text-gray-900 font-bold px-8 py-3 rounded-lg hover:bg-yellow-300 transition-colors text-sm">
            INSCRIBIR A MI HIJ@
          </Link>
          <a href="#programa" className="border border-white text-white font-bold px-8 py-3 rounded-lg hover:bg-white hover:text-blue-900 transition-colors text-sm">
            VER PROGRAMA
          </a>
        </div>
      </div>
    </section>
  )
}