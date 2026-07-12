export function FooterPublico() {
  return (
    <footer className="bg-inverse-surface border-t border-outline-variant w-full py-stack-lg px-margin-desktop flex flex-col md:flex-row justify-between items-center mt-auto">
      <div className="text-body-lg font-headline-md text-surface-container-lowest mb-4 md:mb-0">
        Tottem Hub
      </div>
      <div className="flex flex-wrap justify-center gap-6 mb-4 md:mb-0">
        <a className="font-caption text-caption text-tertiary-fixed-dim hover:text-primary-fixed transition-colors" href="#">
          Privacidad
        </a>
        <a className="font-caption text-caption text-tertiary-fixed-dim hover:text-primary-fixed transition-colors" href="#">
          Términos
        </a>
        <a className="font-caption text-caption text-tertiary-fixed-dim hover:text-primary-fixed transition-colors" href="#">
          Contacto
        </a>
      </div>
      <div className="font-caption text-caption text-primary-fixed-dim text-center md:text-right">
        &copy; {new Date().getFullYear()} Tottem Hub. Todos los derechos reservados.
      </div>
    </footer>
  )
}
