-- Create Department table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Batch table
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, department_id)
);

-- Create Section table
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, batch_id)
);

-- Add RLS policies
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Everyone can view departments, batches, sections
CREATE POLICY "Allow public read access to departments" 
ON public.departments FOR SELECT USING (true);

CREATE POLICY "Allow public read access to batches" 
ON public.batches FOR SELECT USING (true);

CREATE POLICY "Allow public read access to sections" 
ON public.sections FOR SELECT USING (true);

-- Only super-admin can create/update/delete
CREATE POLICY "Allow super_admin full access to departments" 
ON public.departments FOR ALL 
USING (auth.jwt() ->> 'role' = 'super-admin');

CREATE POLICY "Allow super_admin full access to batches" 
ON public.batches FOR ALL 
USING (auth.jwt() ->> 'role' = 'super-admin');

CREATE POLICY "Allow super_admin full access to sections" 
ON public.sections FOR ALL 
USING (auth.jwt() ->> 'role' = 'super-admin');

-- Add department, batch, section references to users table
ALTER TABLE public.users
ADD COLUMN department_id UUID REFERENCES public.departments(id),
ADD COLUMN batch_id UUID REFERENCES public.batches(id),
ADD COLUMN section_id UUID REFERENCES public.sections(id);

-- Update role field to include section_admin
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('user', 'admin', 'section_admin', 'super-admin'));

-- Create Task table with section reference
CREATE TABLE public.section_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Routine table with section reference
CREATE TABLE public.section_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  schedule JSONB NOT NULL,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for section tasks and routines
ALTER TABLE public.section_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_routines ENABLE ROW LEVEL SECURITY;

-- Users can view their own section's tasks and routines
CREATE POLICY "Users can view their section's tasks" 
ON public.section_tasks FOR SELECT 
USING (
  section_id = (SELECT section_id FROM public.users WHERE id = auth.uid()) OR
  auth.jwt() ->> 'role' = 'section_admin' OR
  auth.jwt() ->> 'role' = 'super-admin'
);

CREATE POLICY "Users can view their section's routines" 
ON public.section_routines FOR SELECT 
USING (
  section_id = (SELECT section_id FROM public.users WHERE id = auth.uid()) OR
  auth.jwt() ->> 'role' = 'section_admin' OR
  auth.jwt() ->> 'role' = 'super-admin'
);

-- Section admins can manage tasks and routines for their assigned section
CREATE POLICY "Section admins can manage their section's tasks" 
ON public.section_tasks FOR ALL 
USING (
  (auth.jwt() ->> 'role' = 'section_admin' AND 
   section_id = (SELECT section_id FROM public.users WHERE id = auth.uid())) OR
  auth.jwt() ->> 'role' = 'super-admin'
);

CREATE POLICY "Section admins can manage their section's routines" 
ON public.section_routines FOR ALL 
USING (
  (auth.jwt() ->> 'role' = 'section_admin' AND 
   section_id = (SELECT section_id FROM public.users WHERE id = auth.uid())) OR
  auth.jwt() ->> 'role' = 'super-admin'
);

-- Super admins can do everything
CREATE POLICY "Super admins can manage all tasks" 
ON public.section_tasks FOR ALL 
USING (auth.jwt() ->> 'role' = 'super-admin');

CREATE POLICY "Super admins can manage all routines" 
ON public.section_routines FOR ALL 
USING (auth.jwt() ->> 'role' = 'super-admin');

-- Create a table to track section admins
CREATE TABLE public.section_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, section_id)
);

-- Add RLS policies for section_admins
ALTER TABLE public.section_admins ENABLE ROW LEVEL SECURITY;

-- Section admins can see their own assignments
CREATE POLICY "Section admins can view their own assignments"
ON public.section_admins FOR SELECT
USING (user_id = auth.uid() OR auth.jwt() ->> 'role' = 'super-admin');

-- Only super admins can manage section admin assignments
CREATE POLICY "Super admins can manage section admin assignments"
ON public.section_admins FOR ALL
USING (auth.jwt() ->> 'role' = 'super-admin');

-- Create function to check if user is admin of a section
CREATE OR REPLACE FUNCTION public.is_section_admin(section_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.section_admins sa
    WHERE sa.user_id = auth.uid() 
    AND sa.section_id = section_uuid
  ) OR auth.jwt() ->> 'role' = 'super-admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert departments
INSERT INTO public.departments (name) VALUES 
('Computer Science and Engineering (CSE)'),
('Software Engineering (SWE)'),
('Multimedia and Creative Technology (MCT)'),
('Computing and Information Systems (CIS)'),
('Information Technology and Management (ITM)')
ON CONFLICT (name) DO NOTHING;

-- Create function to validate DIU email domain
CREATE OR REPLACE FUNCTION public.validate_diu_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email !~ '@diu.edu.bd$' AND 
     NEW.email !~ '@admin.diu.edu.bd$' AND 
     NEW.email != 'superadmin@nesttask.com' THEN
    RAISE EXCEPTION 'Email must be from diu.edu.bd domain';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email validation
DROP TRIGGER IF EXISTS validate_diu_email_trigger ON auth.users;
CREATE TRIGGER validate_diu_email_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.validate_diu_email();

-- Create function to set default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'superadmin@nesttask.com' THEN
    UPDATE auth.users SET role = 'super-admin' WHERE id = NEW.id;
  ELSE
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'user');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Function to update a user's department, batch, and section
CREATE OR REPLACE FUNCTION public.update_user_section(
  user_uuid UUID,
  department_uuid UUID,
  batch_uuid UUID,
  section_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  can_update BOOLEAN;
  valid_hierarchy BOOLEAN;
BEGIN
  -- Check if the current user has permission to update the target user
  IF auth.uid() = user_uuid OR auth.jwt() ->> 'role' = 'super-admin' THEN
    can_update := TRUE;
  ELSE
    can_update := FALSE;
  END IF;
  
  -- Verify hierarchy: department -> batch -> section
  SELECT EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.batches b ON s.batch_id = b.id
    JOIN public.departments d ON b.department_id = d.id
    WHERE s.id = section_uuid
    AND b.id = batch_uuid
    AND d.id = department_uuid
  ) INTO valid_hierarchy;
  
  IF NOT valid_hierarchy THEN
    RAISE EXCEPTION 'Invalid hierarchy: Department, batch, and section must be related';
  END IF;

  IF can_update AND valid_hierarchy THEN
    UPDATE public.users
    SET 
      department_id = department_uuid,
      batch_id = batch_uuid,
      section_id = section_uuid
    WHERE id = user_uuid;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote a user to section admin
CREATE OR REPLACE FUNCTION public.set_section_admin(
  user_uuid UUID,
  section_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  is_super_admin BOOLEAN;
  user_exists BOOLEAN;
BEGIN
  -- Check if current user is super-admin
  SELECT auth.jwt() ->> 'role' = 'super-admin' INTO is_super_admin;
  
  -- Check if the user to be promoted exists
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = user_uuid
  ) INTO user_exists;
  
  IF is_super_admin AND user_exists THEN
    -- Update the user's role
    UPDATE public.users
    SET role = 'section_admin'
    WHERE id = user_uuid;
    
    -- Assign the user to the section
    INSERT INTO public.section_admins (user_id, section_id, assigned_by)
    VALUES (user_uuid, section_uuid, auth.uid())
    ON CONFLICT (user_id, section_id) DO NOTHING;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all tasks for a user's section
CREATE OR REPLACE FUNCTION public.get_my_section_tasks()
RETURNS SETOF public.section_tasks AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM public.section_tasks t
  JOIN public.users u ON u.section_id = t.section_id
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all routines for a user's section
CREATE OR REPLACE FUNCTION public.get_my_section_routines()
RETURNS SETOF public.section_routines AS $$
BEGIN
  RETURN QUERY
  SELECT r.*
  FROM public.section_routines r
  JOIN public.users u ON u.section_id = r.section_id
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get section details
CREATE OR REPLACE FUNCTION public.get_section_details(section_uuid UUID)
RETURNS TABLE (
  section_id UUID,
  section_name TEXT,
  batch_id UUID,
  batch_name TEXT,
  department_id UUID,
  department_name TEXT,
  user_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as section_id,
    s.name as section_name,
    b.id as batch_id,
    b.name as batch_name,
    d.id as department_id,
    d.name as department_name,
    COUNT(u.id) as user_count
  FROM public.sections s
  JOIN public.batches b ON s.batch_id = b.id
  JOIN public.departments d ON b.department_id = d.id
  LEFT JOIN public.users u ON u.section_id = s.id
  WHERE s.id = section_uuid
  GROUP BY s.id, s.name, b.id, b.name, d.id, d.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for users with their section data
CREATE OR REPLACE VIEW public.users_with_sections AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.phone,
  u.student_id,
  u.department_id,
  d.name as department_name,
  u.batch_id,
  b.name as batch_name,
  u.section_id,
  s.name as section_name,
  u.created_at,
  u.last_active
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
LEFT JOIN public.batches b ON u.batch_id = b.id
LEFT JOIN public.sections s ON u.section_id = s.id;

-- Create view for section admins
CREATE OR REPLACE VIEW public.section_admins_view AS
SELECT 
  sa.id,
  sa.user_id,
  u.email,
  u.name,
  s.id as section_id,
  s.name as section_name,
  b.id as batch_id,
  b.name as batch_name,
  d.id as department_id,
  d.name as department_name,
  sa.created_at,
  sa.assigned_by
FROM public.section_admins sa
JOIN public.users u ON sa.user_id = u.id
JOIN public.sections s ON sa.section_id = s.id
JOIN public.batches b ON s.batch_id = b.id
JOIN public.departments d ON b.department_id = d.id;

-- Add RLS policies for the views
ALTER VIEW public.users_with_sections SET (security_invoker = on);
ALTER VIEW public.section_admins_view SET (security_invoker = on);

-- Function for section admins to get users in their section
CREATE OR REPLACE FUNCTION public.get_section_users(section_uuid UUID DEFAULT NULL)
RETURNS SETOF public.users_with_sections AS $$
DECLARE
  user_section_id UUID;
  user_role TEXT;
BEGIN
  -- Get current user's section and role
  SELECT section_id, role INTO user_section_id, user_role
  FROM public.users
  WHERE id = auth.uid();

  -- If section UUID is provided, use it (for super-admin)
  -- Otherwise use the admin's section
  IF section_uuid IS NULL THEN
    section_uuid := user_section_id;
  END IF;

  -- Super admin can see any section's users
  IF user_role = 'super-admin' THEN
    RETURN QUERY
    SELECT * FROM public.users_with_sections
    WHERE section_id = section_uuid
    ORDER BY created_at DESC;
  -- Section admin can only see their own section's users
  ELSIF user_role = 'section_admin' AND user_section_id = section_uuid THEN
    RETURN QUERY
    SELECT * FROM public.users_with_sections
    WHERE section_id = user_section_id
    ORDER BY created_at DESC;
  ELSE
    -- Return empty set if not authorized
    RETURN QUERY
    SELECT * FROM public.users_with_sections
    WHERE 1=0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for section admins to create tasks for their section
CREATE OR REPLACE FUNCTION public.create_section_task(
  title TEXT,
  description TEXT,
  due_date TIMESTAMPTZ,
  section_uuid UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  user_section_id UUID;
  user_role TEXT;
  new_task_id UUID;
BEGIN
  -- Get current user's section and role
  SELECT section_id, role INTO user_section_id, user_role
  FROM public.users
  WHERE id = auth.uid();

  -- If section UUID is provided, use it (for super-admin)
  -- Otherwise use the admin's section
  IF section_uuid IS NULL THEN
    section_uuid := user_section_id;
  END IF;

  -- Check if user has permission to create task for this section
  IF user_role = 'super-admin' OR 
     (user_role = 'section_admin' AND user_section_id = section_uuid) THEN
    
    INSERT INTO public.section_tasks (title, description, due_date, section_id, created_by)
    VALUES (title, description, due_date, section_uuid, auth.uid())
    RETURNING id INTO new_task_id;
    
    RETURN new_task_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to create tasks for this section';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for section admins to create routines for their section
CREATE OR REPLACE FUNCTION public.create_section_routine(
  title TEXT,
  schedule JSONB,
  section_uuid UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  user_section_id UUID;
  user_role TEXT;
  new_routine_id UUID;
BEGIN
  -- Get current user's section and role
  SELECT section_id, role INTO user_section_id, user_role
  FROM public.users
  WHERE id = auth.uid();

  -- If section UUID is provided, use it (for super-admin)
  -- Otherwise use the admin's section
  IF section_uuid IS NULL THEN
    section_uuid := user_section_id;
  END IF;

  -- Check if user has permission to create routine for this section
  IF user_role = 'super-admin' OR 
     (user_role = 'section_admin' AND user_section_id = section_uuid) THEN
    
    INSERT INTO public.section_routines (title, schedule, section_id, created_by)
    VALUES (title, schedule, section_uuid, auth.uid())
    RETURNING id INTO new_routine_id;
    
    RETURN new_routine_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to create routines for this section';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to register a user with department, batch, and section
CREATE OR REPLACE FUNCTION public.register_with_section(
  email TEXT,
  password TEXT,
  name TEXT,
  phone TEXT,
  student_id TEXT,
  department_uuid UUID,
  batch_uuid UUID,
  section_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  valid_hierarchy BOOLEAN;
BEGIN
  -- Verify email is from diu.edu.bd domain
  IF email !~ '@diu.edu.bd$' THEN
    RAISE EXCEPTION 'Email must be from diu.edu.bd domain';
  END IF;
  
  -- Verify hierarchy: department -> batch -> section
  SELECT EXISTS (
    SELECT 1 FROM public.sections s
    JOIN public.batches b ON s.batch_id = b.id
    JOIN public.departments d ON b.department_id = d.id
    WHERE s.id = section_uuid
    AND b.id = batch_uuid
    AND d.id = department_uuid
  ) INTO valid_hierarchy;
  
  IF NOT valid_hierarchy THEN
    RAISE EXCEPTION 'Invalid hierarchy: Department, batch, and section must be related';
  END IF;

  -- Create user in auth.users
  INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
  VALUES (
    email,
    crypt(password, gen_salt('bf')),
    now(),
    'user'
  )
  RETURNING id INTO new_user_id;
  
  -- Update public.users with section data
  UPDATE public.users
  SET 
    name = register_with_section.name,
    phone = register_with_section.phone,
    student_id = register_with_section.student_id,
    department_id = department_uuid,
    batch_id = batch_uuid,
    section_id = section_uuid
  WHERE id = new_user_id;
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user with section data
CREATE OR REPLACE FUNCTION public.get_current_user_with_section()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  phone TEXT,
  student_id TEXT,
  department_id UUID,
  department_name TEXT,
  batch_id UUID,
  batch_name TEXT,
  section_id UUID,
  section_name TEXT,
  created_at TIMESTAMPTZ,
  last_active TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.phone,
    u.student_id,
    u.department_id,
    d.name as department_name,
    u.batch_id,
    b.name as batch_name,
    u.section_id,
    s.name as section_name,
    u.created_at,
    u.last_active
  FROM public.users u
  LEFT JOIN public.departments d ON u.department_id = d.id
  LEFT JOIN public.batches b ON u.batch_id = b.id
  LEFT JOIN public.sections s ON u.section_id = s.id
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 