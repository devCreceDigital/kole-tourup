'use client'
import React, { useRef, useState } from 'react'

const FORMATOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png']
const TAMANO_MAXIMO = 10 * 1024 * 1024

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  uploading?: boolean
  progress?: number
}

export function FileUploader({ onFileSelect, uploading = false, progress = 0 }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (file.size > TAMANO_MAXIMO) {
      setError('El archivo no puede superar 10 MB.')
      return
    }
    if (!FORMATOS_PERMITIDOS.includes(file.type)) {
      setError('Formato no permitido. Use PDF, JPG o PNG.')
      return
    }
    setSelectedFile(file)
    onFileSelect(file)
  }

  return (
    <div className="w-full">
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
      >
        <p className="text-sm text-gray-500">Haz clic para seleccionar un archivo</p>
        <p className="text-xs text-gray-400 mt-1">PDF, JPG o PNG — max 10 MB</p>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} className="hidden" />
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      {selectedFile && !error && (
        <div className="mt-2 text-sm text-gray-700">
          <span className="font-medium">{selectedFile.name}</span>
          <span className="text-gray-400 ml-2">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
        </div>
      )}
      {uploading && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">{progress}% subido</p>
        </div>
      )}
    </div>
  )
}