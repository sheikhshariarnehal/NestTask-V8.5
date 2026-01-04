-- Fix user data saving issues during signup
-- This migration improves how user metadata is extracted and stored

-- Create a more robust function to extract user metadata with better field mapping
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  role_value TEXT;
  department_id_value UUID;
  batch_id_value UUID;
  section_id_value UUID;
  student_id_value TEXT;
  phone_value TEXT;
  name_value TEXT;
BEGIN
  -- Extract and normalize role
  IF NEW.email = 'superadmin@nesttask.com' THEN
    role_value := 'super-admin';
  ELSIF NEW.raw_app_meta_data->>'role' = 'super-admin' OR NEW.raw_app_meta_data->>'role' = 'super_admin' THEN
    role_value := 'super-admin';
  ELSIF NEW.raw_app_meta_data->>'role' = 'admin' THEN
    role_value := 'admin';
  ELSIF NEW.raw_app_meta_data->>'role' = 'section-admin' OR NEW.raw_app_meta_data->>'role' = 'section_admin' THEN
    role_value := 'section-admin';
  ELSE
    role_value := 'user';
  END IF;

  -- Debug log the raw metadata to help diagnose issues
  RAISE LOG 'New user metadata - raw_user_meta_data: %, raw_app_meta_data: %', 
    NEW.raw_user_meta_data, 
    NEW.raw_app_meta_data;

  -- Extract name with fallbacks
  name_value := COALESCE(
    NEW.raw_user_meta_data->>'name', 
    NEW.raw_app_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Extract phone with proper field checking
  phone_value := COALESCE(
    NEW.raw_user_meta_data->>'phone', 
    NEW.raw_app_meta_data->>'phone',
    NULL
  );
  
  -- Extract student ID with proper field checking
  student_id_value := COALESCE(
    NEW.raw_user_meta_data->>'studentId', 
    NEW.raw_app_meta_data->>'studentId',
    NULL
  );

  -- Handle UUID conversions with robust error handling for department_id
  BEGIN
    IF NEW.raw_user_meta_data->>'departmentId' IS NOT NULL THEN
      department_id_value := (NEW.raw_user_meta_data->>'departmentId')::UUID;
    ELSIF NEW.raw_app_meta_data->>'departmentId' IS NOT NULL THEN
      department_id_value := (NEW.raw_app_meta_data->>'departmentId')::UUID;
    ELSE
      department_id_value := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Invalid department_id value: %, error: %', 
      COALESCE(NEW.raw_user_meta_data->>'departmentId', NEW.raw_app_meta_data->>'departmentId', 'NULL'),
      SQLERRM;
    department_id_value := NULL;
  END;

  -- Handle UUID conversions with robust error handling for batch_id
  BEGIN
    IF NEW.raw_user_meta_data->>'batchId' IS NOT NULL THEN
      batch_id_value := (NEW.raw_user_meta_data->>'batchId')::UUID;
    ELSIF NEW.raw_app_meta_data->>'batchId' IS NOT NULL THEN
      batch_id_value := (NEW.raw_app_meta_data->>'batchId')::UUID;
    ELSE
      batch_id_value := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Invalid batch_id value: %, error: %', 
      COALESCE(NEW.raw_user_meta_data->>'batchId', NEW.raw_app_meta_data->>'batchId', 'NULL'),
      SQLERRM;
    batch_id_value := NULL;
  END;

  -- Handle UUID conversions with robust error handling for section_id
  BEGIN
    IF NEW.raw_user_meta_data->>'sectionId' IS NOT NULL THEN
      section_id_value := (NEW.raw_user_meta_data->>'sectionId')::UUID;
    ELSIF NEW.raw_app_meta_data->>'sectionId' IS NOT NULL THEN
      section_id_value := (NEW.raw_app_meta_data->>'sectionId')::UUID;
    ELSE
      section_id_value := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Invalid section_id value: %, error: %', 
      COALESCE(NEW.raw_user_meta_data->>'sectionId', NEW.raw_app_meta_data->>'sectionId', 'NULL'),
      SQLERRM;
    section_id_value := NULL;
  END;

  -- Log extracted values for debugging
  RAISE LOG 'Extracted values - name: %, phone: %, student_id: %, department_id: %, batch_id: %, section_id: %',
    name_value, phone_value, student_id_value, department_id_value, batch_id_value, section_id_value;

  -- Insert into public.users with all extracted data
  INSERT INTO public.users (
    id, 
    email, 
    name, 
    role, 
    created_at,
    last_active,
    phone,
    student_id,
    department_id,
    batch_id,
    section_id
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    name_value, 
    role_value, 
    NEW.created_at,
    NEW.created_at,
    phone_value,
    student_id_value,
    department_id_value,
    batch_id_value,
    section_id_value
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    last_active = EXCLUDED.last_active,
    phone = EXCLUDED.phone,
    student_id = EXCLUDED.student_id,
    department_id = EXCLUDED.department_id,
    batch_id = EXCLUDED.batch_id,
    section_id = EXCLUDED.section_id;

  -- Update user role in auth.users for consistency
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb), 
    '{role}', 
    to_jsonb(role_value)
  )
  WHERE id = NEW.id AND (raw_app_meta_data->>'role' IS NULL OR raw_app_meta_data->>'role' <> role_value);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add debug function to inspect user data
CREATE OR REPLACE FUNCTION public.debug_user_data(user_id UUID)
RETURNS TABLE (
  auth_user JSONB,
  public_user JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jsonb_build_object(
      'id', au.id,
      'email', au.email,
      'role', au.role,
      'user_metadata', au.raw_user_meta_data,
      'app_metadata', au.raw_app_meta_data
    ) as auth_user,
    to_jsonb(pu) as public_user
  FROM 
    auth.users au
  LEFT JOIN
    public.users pu ON au.id = pu.id
  WHERE
    au.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for users with their section, batch, and department info
CREATE OR REPLACE VIEW public.users_with_full_info AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.phone,
  u.student_id AS "studentId",
  u.department_id AS "departmentId",
  d.name AS "departmentName",
  u.batch_id AS "batchId",
  b.name AS "batchName",
  u.section_id AS "sectionId",
  s.name AS "sectionName",
  u.created_at AS "createdAt",
  u.last_active AS "lastActive"
FROM 
  public.users u
LEFT JOIN 
  public.departments d ON u.department_id = d.id
LEFT JOIN 
  public.batches b ON u.batch_id = b.id
LEFT JOIN 
  public.sections s ON u.section_id = s.id;

-- Add RLS policy for users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can see their own data'
  ) THEN
    CREATE POLICY "Users can see their own data"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id OR auth.jwt() ->> 'role' IN ('section-admin', 'admin', 'super-admin'));
  END IF;
END
$$; 