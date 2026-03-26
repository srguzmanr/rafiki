-- Migration: Create sorteo_images table for prize image uploads.
--
-- Images are stored in Supabase Storage bucket "sorteo-images" (public read).
-- This table tracks image metadata and display order per sorteo.
-- The storage bucket must be created manually in Supabase Dashboard.

CREATE TABLE IF NOT EXISTS sorteo_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sorteo_id UUID NOT NULL REFERENCES sorteos(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  storage_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sorteo_images_sorteo ON sorteo_images(sorteo_id, display_order);

ALTER TABLE sorteo_images ENABLE ROW LEVEL SECURITY;

-- Public can view images for published sorteos
CREATE POLICY "sorteo_images: public can view published"
ON sorteo_images FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM sorteos
    WHERE sorteos.id = sorteo_images.sorteo_id
    AND sorteos.status IN ('active', 'closed', 'drawn')
  )
);

-- Organizador/admin can view all images for their org (including drafts)
CREATE POLICY "sorteo_images: org members see own"
ON sorteo_images FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = sorteo_images.organization_id
    AND user_roles.role IN ('organizador', 'admin')
    AND user_roles.status = 'active'
  )
);

-- Organizador/admin can insert images for their org
CREATE POLICY "sorteo_images: org can insert"
ON sorteo_images FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = sorteo_images.organization_id
    AND user_roles.role IN ('organizador', 'admin')
    AND user_roles.status = 'active'
  )
);

-- Organizador/admin can update images for their org
CREATE POLICY "sorteo_images: org can update"
ON sorteo_images FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = sorteo_images.organization_id
    AND user_roles.role IN ('organizador', 'admin')
    AND user_roles.status = 'active'
  )
);

-- Organizador/admin can delete images for their org
CREATE POLICY "sorteo_images: org can delete"
ON sorteo_images FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.organization_id = sorteo_images.organization_id
    AND user_roles.role IN ('organizador', 'admin')
    AND user_roles.status = 'active'
  )
);
