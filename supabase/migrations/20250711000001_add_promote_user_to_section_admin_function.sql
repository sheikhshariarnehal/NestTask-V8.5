-- Migration: Add promote_user_to_section_admin function
-- Description: Creates a database function to promote users to section admin role securely

-- Drop the function if it exists to ensure clean creation
DROP FUNCTION IF EXISTS public.promote_user_to_section_admin(UUID);

-- Create the function with a parameter name that avoids column name conflicts
CREATE OR REPLACE FUNCTION public.promote_user_to_section_admin(input_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_role TEXT;
  v_section_id UUID;
  v_current_user UUID;
BEGIN
  -- Get the current user ID (the admin doing the promotion)
  v_current_user := auth.uid();
  
  -- Get the user's current role and section
  SELECT role, section_id INTO v_user_role, v_section_id
  FROM public.users
  WHERE id = input_user_id;

  -- Check if the user exists
  IF v_user_role IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Check if the user already has section_admin role
  IF v_user_role = 'section_admin' THEN
    RAISE EXCEPTION 'User is already a section admin';
  END IF;
  
  -- Check if the user has a section assigned
  IF v_section_id IS NULL THEN
    RAISE EXCEPTION 'User does not have a section assigned';
  END IF;

  -- Update the user's role
  UPDATE public.users
  SET role = 'section_admin'
  WHERE id = input_user_id;

  -- Delete any existing entry to avoid conflicts
  DELETE FROM public.section_admins
  WHERE user_id = input_user_id
  AND section_id = v_section_id;
  
  -- Add a new record
  INSERT INTO public.section_admins(user_id, section_id, assigned_by)
  VALUES (input_user_id, v_section_id, v_current_user);

  -- Log the promotion action
  INSERT INTO public.user_activities(user_id, activity_type, action, metadata)
  VALUES (
    v_current_user,
    'admin_action',
    'promote_to_section_admin',
    jsonb_build_object(
      'promoted_user_id', input_user_id,
      'section_id', v_section_id
    )
  );
END;
$$;

-- Add comments to the function for better documentation
COMMENT ON FUNCTION public.promote_user_to_section_admin(UUID) IS 'Securely promotes a user to section admin role, creates entry in section_admins table, and logs the action'; 