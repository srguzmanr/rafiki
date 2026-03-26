// src/components/ImageUploader.jsx
// Drag-and-drop image upload with preview, reorder, and remove.

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, X, ChevronUp, ChevronDown } from 'lucide-react'
import { validateImage, getImageUrl } from '@/lib/storage'

const MAX_IMAGES = 5

export function ImageUploader({ images, onChange, disabled }) {
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  function addFiles(files) {
    setError(null)
    const newImages = [...images]

    for (const file of files) {
      if (newImages.length >= MAX_IMAGES) {
        setError(`Máximo ${MAX_IMAGES} imágenes.`)
        break
      }
      const validationError = validateImage(file)
      if (validationError) {
        setError(validationError)
        continue
      }
      newImages.push({
        file,
        preview: URL.createObjectURL(file),
        storage_path: null, // not yet uploaded
      })
    }

    onChange(newImages)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    addFiles(Array.from(e.dataTransfer.files))
  }

  function handleFileSelect(e) {
    if (e.target.files) addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function removeImage(index) {
    const updated = images.filter((_, i) => i !== index)
    onChange(updated)
  }

  function moveImage(index, direction) {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= images.length) return
    const updated = [...images]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    onChange(updated)
  }

  function getThumbUrl(img) {
    if (img.preview) return img.preview
    if (img.storage_path) return getImageUrl(img.storage_path)
    return ''
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Arrastra imágenes aquí o haz clic</p>
        <p className="text-xs text-muted-foreground mt-1">
          JPG, PNG o WebP. Máximo 5MB. Hasta {MAX_IMAGES} imágenes.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {images.map((img, index) => (
            <div key={index} className="relative group border rounded-lg overflow-hidden">
              <img
                src={getThumbUrl(img)}
                alt={`Imagen ${index + 1}`}
                className="w-full h-24 object-cover"
              />
              {index === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  Portada
                </span>
              )}
              {!disabled && (
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {index > 0 && (
                    <button type="button" onClick={() => moveImage(index, -1)}
                      className="bg-black/60 text-white rounded p-0.5 hover:bg-black/80">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {index < images.length - 1 && (
                    <button type="button" onClick={() => moveImage(index, 1)}
                      className="bg-black/60 text-white rounded p-0.5 hover:bg-black/80">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={() => removeImage(index)}
                    className="bg-red-600/80 text-white rounded p-0.5 hover:bg-red-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
