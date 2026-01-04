/*
  # Lecture Slides Feature

  1. New Tables
    - `lecture_slides` table for storing lecture slide entries
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, optional)
      - `section_id` (uuid, references sections)
      - `file_urls` (text array for uploaded files)
      - `original_file_names` (text array for original filenames)
      - `slide_links` (text array for external slide URLs)
      - `video_links` (text array for YouTube/Google Drive video URLs)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on lecture_slides table
    - Add policies for section admin management
    - Add policies for user viewing access
    - Grant necessary permissions

  3. Storage
    - Create lecture-slides storage bucket
    - Add storage policies for file uploads
*/

-- Create lecture_slides table with safe error handling
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'lecture_slides') THEN
        CREATE TABLE lecture_slides (
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
        CREATE INDEX idx_lecture_slides_section_id ON lecture_slides(section_id);
        CREATE INDEX idx_lecture_slides_created_by ON lecture_slides(created_by);
        CREATE INDEX idx_lecture_slides_created_at ON lecture_slides(created_at DESC);

        -- Enable RLS
        ALTER TABLE lecture_slides ENABLE ROW LEVEL SECURITY;

        RAISE NOTICE 'lecture_slides table created successfully';
    ELSE
        RAISE NOTICE 'lecture_slides table already exists';
    END IF;
END
$$;

-- Create storage bucket for lecture slides if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('lecture-slides', 'lecture-slides', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for lecture_slides table
DO $$
BEGIN
    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Users can view lecture slides from their section" ON lecture_slides;
    DROP POLICY IF EXISTS "Section admins can manage lecture slides for their section" ON lecture_slides;
    DROP POLICY IF EXISTS "Super admins can manage all lecture slides" ON lecture_slides;

    -- Create new policies
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

    RAISE NOTICE 'RLS policies created successfully';
END
$$;

-- Storage policies for lecture-slides bucket
DO $$
BEGIN
    -- Drop existing storage policies if they exist
    DROP POLICY IF EXISTS "Public read access to lecture slides" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload lecture slides" ON storage.objects;
    DROP POLICY IF EXISTS "Section admins can update lecture slides files" ON storage.objects;
    DROP POLICY IF EXISTS "Section admins can delete lecture slides files" ON storage.objects;

    -- Create new storage policies
    CREATE POLICY "Public read access to lecture slides"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'lecture-slides');

    CREATE POLICY "Authenticated users can upload lecture slides"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'lecture-slides' AND
      EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
        AND u.role IN ('section_admin', 'super-admin')
      )
    );

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

    RAISE NOTICE 'Storage policies created successfully';
END
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lecture_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_lecture_slides_updated_at_trigger ON lecture_slides;
CREATE TRIGGER update_lecture_slides_updated_at_trigger
  BEFORE UPDATE ON lecture_slides
  FOR EACH ROW
  EXECUTE FUNCTION update_lecture_slides_updated_at();

-- Grant necessary permissions
GRANT ALL ON lecture_slides TO authenticated;
GRANT ALL ON lecture_slides TO service_role;

-- Final verification
SELECT 'Migration completed successfully!' as status;
