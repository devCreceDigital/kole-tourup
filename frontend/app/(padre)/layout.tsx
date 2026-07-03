import { PadreNavbar } from '@/components/padre/PadreNavbar'

export default function PadreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PadreNavbar />

      <main className="flex-1">
        {children}
      </main>

      {/* Footer — igual al mockup */}
      <footer className="bg-white border-t border-gray-200 mt-10">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between gap-4 text-xs text-gray-500">
            <div className="space-y-1">
              <p className="font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Inscripciones y pagos</p>
              <p>✉ admin@tottem.pe &nbsp;|&nbsp; 📞 951 32 44 15 &nbsp;|&nbsp; 📱 +51 652 22 47 05</p>
              <p>✉ info@tottem.pe &nbsp;|&nbsp; 📱 +51 552 32 47 05</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-700 text-[11px] uppercase tracking-wide">Nuestros Seguros de Viaje</p>
              <p className="mt-1">LICENCIA AGENCIA DE VIAJES: CIAN 298009-2</p>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400 justify-center">
            <a href="#" className="hover:underline">Aviso legal</a>
            <a href="#" className="hover:underline">Política de privacidad</a>
            <a href="#" className="hover:underline">Condiciones generales</a>
            <a href="#" className="hover:underline">Contrato de viaje combinado</a>
            <a href="#" className="hover:underline">Políticas de cookies</a>
          </div>
          <p className="text-center text-[11px] text-gray-400 mt-2">
            Copyright © 2022, GRUPO TOTTem Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
