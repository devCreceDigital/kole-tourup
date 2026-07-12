'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function NavbarPublico() {
  const router = useRouter()

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-outline-variant/30 sticky top-0 z-50 transition-all duration-300">
      <div className="flex justify-between items-center w-full px-4 md:px-margin-desktop h-20 max-w-container-max mx-auto">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-300">
            <span className="material-symbols-outlined font-bold">explore</span>
          </div>
          <span className="text-headline-md font-headline-md font-extrabold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            Tottem Hub
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/login')}
            className="cursor-pointer text-white bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all duration-300 flex items-center justify-center w-10 h-10 rounded-full"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  )
}
