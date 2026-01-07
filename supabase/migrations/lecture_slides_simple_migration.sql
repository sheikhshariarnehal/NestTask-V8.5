-- Simple Lecture Slides Migration
-- Run this step by step in your Supabase SQL Editor

-- Step 1: Check if table exists and create if needed
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
        
        -- Create indexes
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

-- Step 2: Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('lecture-slides', 'lecture-slides', true)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Create or replace policies (this will handle existing policies)
DO $$
BEGIN
    -- Drop existing policies if they exist
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

-- Step 4: Create storage policies
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

-- Step 5: Create trigger function and trigger
CREATE OR REPLACE FUNCTION update_lecture_slides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lecture_slides_updated_at_trigger ON lecture_slides;
CREATE TRIGGER update_lecture_slides_updated_at_trigger
  BEFORE UPDATE ON lecture_slides
  FOR EACH ROW
  EXECUTE FUNCTION update_lecture_slides_updated_at();

-- Step 6: Grant permissions
GRANT ALL ON lecture_slides TO authenticated;
GRANT ALL ON lecture_slides TO service_role;

-- Final verification
SELECT 'Migration completed successfully!' as status;
