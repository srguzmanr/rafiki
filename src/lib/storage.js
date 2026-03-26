// src/lib/storage.js
// Supabase Storage helpers for sorteo image uploads.

import { supabase } from './supabase'

const BUCKET = 'sorteo-images'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateImage(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'La imagen debe ser JPG, PNG o WebP.'
  }
  if (file.size > MAX_SIZE) {
    return 'La imagen debe ser menor a 5MB.'
  }
  return null
}

export async function uploadSorteoImage(orgId, sorteoId, file) {
  const ext = file.name.split('.').pop().toLowerCase()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const storagePath = `${orgId}/${sorteoId}/${filename}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (error) return { path: null, error }
  return { path: storagePath, error: null }
}

export async function deleteSorteoImage(storagePath) {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath])
  return { error }
}

export function getImageUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return data?.publicUrl || ''
}

// ─── SORTEO IMAGES TABLE CRUD ───────────────────────────────────────────────

export async function fetchSorteoImages(sorteoId) {
  const { data, error } = await supabase
    .from('sorteo_images')
    .select('*')
    .eq('sorteo_id', sorteoId)
    .order('display_order', { ascending: true })
  return { data: data || [], error }
}

export async function fetchAllSorteoImages() {
  const { data, error } = await supabase
    .from('sorteo_images')
    .select('sorteo_id, storage_path, display_order')
    .order('display_order', { ascending: true })
  return { data: data || [], error }
}

export async function saveSorteoImages(sorteoId, orgId, images) {
  // Delete existing images for this sorteo
  await supabase.from('sorteo_images').delete().eq('sorteo_id', sorteoId)

  if (images.length === 0) return { error: null }

  const rows = images.map((img, i) => ({
    sorteo_id: sorteoId,
    organization_id: orgId,
    storage_path: img.storage_path,
    display_order: i,
  }))

  const { error } = await supabase.from('sorteo_images').insert(rows)
  return { error }
}
