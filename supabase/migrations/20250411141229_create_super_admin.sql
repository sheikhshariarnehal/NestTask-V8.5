-- Create super admin user with UUID
DO $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  -- Check if the super admin already exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'superadmin@nesttask.com'
  ) INTO admin_exists;
  
  IF NOT admin_exists THEN
    -- Create super admin user
    INSERT INTO auth.users (
      id,
      email, 
      encrypted_password, 
      email_confirmed_at, 
      role,
      raw_app_meta_data
    )
    VALUES (
      gen_random_uuid(),
      'superadmin@nesttask.com',
      crypt('SuperAdmin123!', gen_salt('bf')),
      now(),
      'super-admin',
      '{"provider": "email", "providers": ["email"], "role": "super-admin"}'::jsonb
    );
  END IF;
END $$;

-- Add super admin to public.users
INSERT INTO public.users (id, email, name, role)
SELECT id, email, 'Super Admin', 'super-admin'
FROM auth.users
WHERE email = 'superadmin@nesttask.com'
AND NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'superadmin@nesttask.com'
); 