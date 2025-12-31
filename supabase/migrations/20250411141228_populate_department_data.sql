-- Get department IDs and create batch entries for each department
WITH dept_ids AS (
  SELECT id, name FROM public.departments
),
-- Create batch entries for each department
batch_data AS (
  SELECT 
    d.id as department_id,
    unnest(ARRAY[
      'Batch 50', 'Batch 51', 'Batch 52', 'Batch 53', 'Batch 54', 
      'Batch 55', 'Batch 56', 'Batch 57', 'Batch 58', 'Batch 59', 
      'Batch 60', 'Batch 61', 'Batch 62', 'Batch 63', 'Batch 64', 
      'Batch 65', 'Batch 66', 'Batch 67', 'Batch 68', 'Batch 69', 
      'Batch 70'
    ]) as batch_name
  FROM dept_ids d
)
-- Insert batch data
INSERT INTO public.batches (department_id, name)
SELECT department_id, batch_name FROM batch_data
ON CONFLICT (name, department_id) DO NOTHING;

-- Get batch IDs and create section entries for each batch
WITH batch_ids AS (
  SELECT id FROM public.batches
),
-- Create section entries for each batch
section_data AS (
  SELECT 
    b.id as batch_id,
    unnest(ARRAY[
      'Section A', 'Section B', 'Section C', 'Section D', 'Section E', 'Section F', 
      'Section G', 'Section H', 'Section I', 'Section J', 'Section K', 'Section L', 
      'Section M', 'Section N', 'Section O', 'Section P', 'Section Q', 'Section R', 
      'Section S', 'Section T', 'Section U', 'Section V', 'Section W', 'Section X', 
      'Section Y', 'Section Z'
    ]) as section_name
  FROM batch_ids b
)
-- Insert section data
INSERT INTO public.sections (batch_id, name)
SELECT batch_id, section_name FROM section_data
ON CONFLICT (name, batch_id) DO NOTHING;

-- Create storage bucket for section files if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('section-files', 'section-files', true, false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies if they don't exist
DO $$
BEGIN
    -- Create policy for authenticated users to upload files
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow authenticated users to upload files') THEN
        CREATE POLICY "Allow authenticated users to upload files"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'section-files');
    END IF;

    -- Create policy for users to read files
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow everyone to read files') THEN
        CREATE POLICY "Allow everyone to read files"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'section-files');
    END IF;

    -- Create policy for users to manage their own files
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow users to manage their files') THEN
        CREATE POLICY "Allow users to manage their files"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'section-files' AND (auth.uid() = owner OR auth.jwt() ->> 'role' = 'section_admin' OR auth.jwt() ->> 'role' = 'super-admin'));
    END IF;

    -- Create policy for users to delete their files
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow users to delete their files') THEN
        CREATE POLICY "Allow users to delete their files"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'section-files' AND (auth.uid() = owner OR auth.jwt() ->> 'role' = 'section_admin' OR auth.jwt() ->> 'role' = 'super-admin'));
    END IF;
END $$; 