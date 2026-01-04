-- Lecture Slides Migration
-- Run this in your Supabase SQL Editor

-- Create lecture_slides table
CREATE TABLE IF NOT EXISTS lecture_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
  file_urls text[] DEFAULT ARRAY[]::text[],
  original_file_names text[] DEFAULT ARRAY[]::text[],
  slide_links text[] DEFAULT ARRAY[]::text[],
  video_links text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lecture_slides_section_id ON lecture_slides(section_id);
CREATE INDEX IF NOT EXISTS idx_lecture_slides_created_by ON lecture_slides(created_by);
CREATE INDEX IF NOT EXISTS idx_lecture_slides_created_at ON lecture_slides(created_at DESC);

-- Enable RLS
ALTER TABLE lecture_slides ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for lecture slides if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('lecture-slides', 'lecture-slides', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for lecture_slides table

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view lecture slides from their section" ON lecture_slides;
DROP POLICY IF EXISTS "Section admins can manage lecture slides for their section" ON lecture_slides;
DROP POLICY IF EXISTS "Super admins can manage all lecture slides" ON lecture_slides;
DROP POLICY IF EXISTS "Public read access to lecture slides" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload lecture slides" ON storage.objects;
DROP POLICY IF EXISTS "Section admins can update lecture slides files" ON storage.objects;
DROP POLICY IF EXISTS "Section admins can delete lecture slides files" ON storage.objects;

-- Allow all authenticated users to view lecture slides from their section
CREATE POLICY "Users can view lecture slides from their section"
ON lecture_slides FOR SELECT
TO authenticated
USING (
  section_id IN (
    SELECT u.section_id
    FROM users u
    WHERE u.id = auth.uid()
  )
);

-- Allow section admins to manage lecture slides for their section
CREATE POLICY "Section admins can manage lecture slides for their section"
ON lecture_slides FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'section_admin'
    AND u.section_id = lecture_slides.section_id
  )
);

-- Allow super admins to manage all lecture slides
CREATE POLICY "Super admins can manage all lecture slides"
ON lecture_slides FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'super-admin'
  )
);

-- Storage policies for lecture-slides bucket

-- Allow public read access to lecture slides files
CREATE POLICY "Public read access to lecture slides"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'lecture-slides');

-- Allow authenticated users to upload lecture slides files
CREATE POLICY "Authenticated users can upload lecture slides"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lecture-slides' AND
  (
    -- Section admins can upload
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('section_admin', 'super-admin')
    )
  )
);

-- Allow section admins to update their lecture slides files
CREATE POLICY "Section admins can update lecture slides files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lecture-slides' AND
  (
    auth.uid() = owner OR
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('section_admin', 'super-admin')
    )
  )
);

-- Allow section admins to delete their lecture slides files
CREATE POLICY "Section admins can delete lecture slides files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lecture-slides' AND
  (
    auth.uid() = owner OR
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('section_admin', 'super-admin')
    )
  )
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lecture_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_lecture_slides_updated_at_trigger
  BEFORE UPDATE ON lecture_slides
  FOR EACH ROW
  EXECUTE FUNCTION update_lecture_slides_updated_at();

-- Grant necessary permissions
GRANT ALL ON lecture_slides TO authenticated;
GRANT ALL ON lecture_slides TO service_role;
