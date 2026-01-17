


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'user',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_assign_task_to_section_users"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Only auto-assign if task is admin task and has section_id
  IF NEW.is_admin_task = true AND NEW.section_id IS NOT NULL THEN
    -- Insert assignments for all users in the same section
    INSERT INTO task_assignments (task_id, user_id, assigned_by, status)
    SELECT 
      NEW.id,
      users.id,
      NEW.user_id,
      'assigned'::text
    FROM users
    WHERE users.section_id = NEW.section_id
      AND users.id != NEW.user_id -- Don't assign to creator
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_task_to_section_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_confirm_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Auto-confirm email for all signups (useful for development/testing)
  -- In production, you may want to add conditions here
  NEW.email_confirmed_at = NOW();
  NEW.confirmed_at = NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_confirm_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_populate_task_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- If section_id is provided, auto-populate department_id and batch_id
  IF NEW.section_id IS NOT NULL THEN
    SELECT b.department_id, s.batch_id
    INTO NEW.department_id, NEW.batch_id
    FROM sections s
    JOIN batches b ON b.id = s.batch_id
    WHERE s.id = NEW.section_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_populate_task_hierarchy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_admin_exists"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."check_admin_exists"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_section_routine"("title" "text", "schedule" "jsonb", "section_uuid" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_section_routine"("title" "text", "schedule" "jsonb", "section_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_section_task"("title" "text", "description" "text", "due_date" timestamp with time zone, "section_uuid" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_section_task"("title" "text", "description" "text", "due_date" timestamp with time zone, "section_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_department_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select (select u.department_id from public.users u where u.id = auth.uid());
$$;


ALTER FUNCTION "public"."current_user_department_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select coalesce((select u.role from public.users u where u.id = auth.uid()), 'user');
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_section_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select (select u.section_id from public.users u where u.id = auth.uid());
$$;


ALTER FUNCTION "public"."current_user_section_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_user_data"("user_id" "uuid") RETURNS TABLE("auth_user" "jsonb", "public_user" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."debug_user_data"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if the executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only administrators can delete users';
  END IF;

  -- Delete from public.users first (this will cascade to related tables)
  DELETE FROM public.users WHERE id = user_id;

  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."delete_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_with_section"() RETURNS TABLE("id" "uuid", "email" "text", "name" "text", "role" "text", "phone" "text", "student_id" "text", "department_id" "uuid", "department_name" "text", "batch_id" "uuid", "batch_name" "text", "section_id" "uuid", "section_name" "text", "created_at" timestamp with time zone, "last_active" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_current_user_with_section"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_stats"() RETURNS TABLE("total_users" bigint, "total_admins" bigint, "total_section_admins" bigint, "total_tasks" bigint, "completed_tasks" bigint, "total_departments" bigint, "total_batches" bigint, "total_sections" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  if not public.is_app_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from public.users) as total_users,
    (select count(*) from public.users where role = 'admin') as total_admins,
    (select count(*) from public.users where role = 'section_admin') as total_section_admins,
    (select count(*) from public.tasks) as total_tasks,
    (select count(*) from public.tasks where status = 'completed') as completed_tasks,
    (select count(*) from public.departments) as total_departments,
    (select count(*) from public.batches) as total_batches,
    (select count(*) from public.sections) as total_sections;
end;
$$;


ALTER FUNCTION "public"."get_dashboard_stats"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."section_routines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "schedule" "jsonb" NOT NULL,
    "section_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."section_routines" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_section_routines"() RETURNS SETOF "public"."section_routines"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT r.*
  FROM public.section_routines r
  JOIN public.users u ON u.section_id = r.section_id
  WHERE u.id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_my_section_routines"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_section_details"("section_uuid" "uuid") RETURNS TABLE("section_id" "uuid", "section_name" "text", "batch_id" "uuid", "batch_name" "text", "department_id" "uuid", "department_name" "text", "user_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_section_details"("section_uuid" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "department_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "role" "text" DEFAULT 'user'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_active" timestamp with time zone DEFAULT "now"(),
    "phone" "text",
    "student_id" "text",
    "department_id" "uuid",
    "batch_id" "uuid",
    "section_id" "uuid",
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'section_admin'::"text", 'super-admin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."users_with_sections" WITH ("security_invoker"='on') AS
 SELECT "u"."id",
    "u"."email",
    "u"."name",
    "u"."role",
    "u"."phone",
    "u"."student_id",
    "u"."department_id",
    "d"."name" AS "department_name",
    "u"."batch_id",
    "b"."name" AS "batch_name",
    "u"."section_id",
    "s"."name" AS "section_name",
    "u"."created_at",
    "u"."last_active"
   FROM ((("public"."users" "u"
     LEFT JOIN "public"."departments" "d" ON (("u"."department_id" = "d"."id")))
     LEFT JOIN "public"."batches" "b" ON (("u"."batch_id" = "b"."id")))
     LEFT JOIN "public"."sections" "s" ON (("u"."section_id" = "s"."id")));


ALTER VIEW "public"."users_with_sections" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_section_users"("section_uuid" "uuid" DEFAULT NULL::"uuid") RETURNS SETOF "public"."users_with_sections"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_section_users"("section_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_task_statistics"("p_section_id" "uuid" DEFAULT NULL::"uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("total_tasks" bigint, "completed_tasks" bigint, "overdue_tasks" bigint, "in_progress_tasks" bigint, "high_priority_tasks" bigint, "completion_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') AS overdue_tasks,
    COUNT(*) FILTER (WHERE status = 'in-progress') AS in_progress_tasks,
    COUNT(*) FILTER (WHERE priority IN ('high', 'urgent')) AS high_priority_tasks,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END AS completion_rate
  FROM tasks
  WHERE
    (p_section_id IS NULL OR section_id = p_section_id) AND
    (p_user_id IS NULL OR user_id = p_user_id OR assigned_to = p_user_id) AND
    (p_start_date IS NULL OR created_at::DATE >= p_start_date) AND
    (p_end_date IS NULL OR created_at::DATE <= p_end_date);
END;
$$;


ALTER FUNCTION "public"."get_task_statistics"("p_section_id" "uuid", "p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_task_statistics_optimized"("p_section_id" "uuid" DEFAULT NULL::"uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_department_id" "uuid" DEFAULT NULL::"uuid", "p_batch_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("total_tasks" bigint, "completed_tasks" bigint, "overdue_tasks" bigint, "in_progress_tasks" bigint, "high_priority_tasks" bigint, "completion_rate" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_tasks,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') AS overdue_tasks,
    COUNT(*) FILTER (WHERE status = 'in-progress') AS in_progress_tasks,
    COUNT(*) FILTER (WHERE priority IN ('high', 'urgent')) AS high_priority_tasks,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END AS completion_rate
  FROM tasks
  WHERE
    (p_section_id IS NULL OR section_id = p_section_id) AND
    (p_department_id IS NULL OR department_id = p_department_id) AND
    (p_batch_id IS NULL OR batch_id = p_batch_id) AND
    (p_user_id IS NULL OR user_id = p_user_id OR assigned_to = p_user_id) AND
    (p_start_date IS NULL OR created_at::DATE >= p_start_date) AND
    (p_end_date IS NULL OR created_at::DATE <= p_end_date);
END;
$$;


ALTER FUNCTION "public"."get_task_statistics_optimized"("p_section_id" "uuid", "p_user_id" "uuid", "p_department_id" "uuid", "p_batch_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_task_statistics_optimized"("p_section_id" "uuid", "p_user_id" "uuid", "p_department_id" "uuid", "p_batch_id" "uuid", "p_start_date" "date", "p_end_date" "date") IS 'Optimized statistics function supporting department/batch/section hierarchy filtering';



CREATE OR REPLACE FUNCTION "public"."get_user_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  total_users integer;
  active_today integer;
  new_this_week integer;
BEGIN
  -- Get total users
  SELECT COUNT(*) INTO total_users 
  FROM users;
  
  -- Get users active today (based on last_active timestamp)
  SELECT COUNT(*) INTO active_today 
  FROM users 
  WHERE last_active >= CURRENT_DATE;
  
  -- Get new users this week
  SELECT COUNT(*) INTO new_this_week 
  FROM users 
  WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days');
  
  RETURN json_build_object(
    'total_users', total_users,
    'active_today', active_today,
    'new_this_week', new_this_week
  );
END;
$$;


ALTER FUNCTION "public"."get_user_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_task_performance"("p_user_id" "uuid") RETURNS TABLE("user_id" "uuid", "user_name" "text", "total_assigned" bigint, "completed" bigint, "overdue" bigint, "completion_rate" numeric, "avg_completion_days" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    COUNT(t.id) AS total_assigned,
    COUNT(t.id) FILTER (WHERE t.status = 'completed') AS completed,
    COUNT(t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status != 'completed') AS overdue,
    CASE
      WHEN COUNT(t.id) > 0 THEN
        ROUND((COUNT(t.id) FILTER (WHERE t.status = 'completed')::NUMERIC / COUNT(t.id)::NUMERIC) * 100, 2)
      ELSE 0
    END AS completion_rate,
    AVG(
      CASE
        WHEN t.completed_at IS NOT NULL AND t.created_at IS NOT NULL THEN
          EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) / 86400
        ELSE NULL
      END
    )::NUMERIC(10,2) AS avg_completion_days
  FROM users u
  LEFT JOIN tasks t ON t.assigned_to = u.id OR t.user_id = u.id
  WHERE u.id = p_user_id
  GROUP BY u.id, u.name;
END;
$$;


ALTER FUNCTION "public"."get_user_task_performance"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_task_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO activities (type, title, user_id, metadata)
  VALUES (
    'task',
    CASE
      WHEN TG_OP = 'INSERT' THEN 'New task created: ' || NEW.name
      WHEN TG_OP = 'UPDATE' THEN 'Task updated: ' || NEW.name
      WHEN TG_OP = 'DELETE' THEN 'Task deleted: ' || OLD.name
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.user_id
      ELSE NEW.user_id
    END,
    jsonb_build_object(
      'task_id', CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
      'operation', TG_OP
    )
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_task_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE users
  SET last_active = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_profile_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.last_active = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_profile_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_upsert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    UPDATE public.users
    SET 
      email = NEW.email,
      name = COALESCE(NEW.name, split_part(NEW.email, '@', 1)),
      last_active = now()
    WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_upsert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select public.is_app_admin();
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_section_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'section_admin')
    );
END;
$$;


ALTER FUNCTION "public"."is_admin_or_section_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin_or_section_admin"() IS 'Checks if the current user has admin or section admin privileges';



CREATE OR REPLACE FUNCTION "public"."is_app_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select public.current_user_role() = any (array['admin','super-admin']);
$$;


ALTER FUNCTION "public"."is_app_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_app_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select public.current_user_role() = 'super-admin';
$$;


ALTER FUNCTION "public"."is_app_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_section_admin"("section_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists (
    select 1
    from public.section_admins sa
    where sa.user_id = auth.uid()
      and sa.section_id = section_uuid
  )
  or (
    public.current_user_role() = 'section_admin'
    and public.current_user_section_id() = section_uuid
  );
$$;


ALTER FUNCTION "public"."is_section_admin"("section_uuid" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_section_admin"("section_uuid" "uuid") IS 'Checks if the current user is a section admin for the specified section';



CREATE OR REPLACE FUNCTION "public"."is_valid_google_drive_url"("url" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
BEGIN
    -- Return false for null or empty URLs
    IF url IS NULL OR trim(url) = '' THEN
        RETURN FALSE;
    END IF;

    -- Comprehensive validation for Google Drive URLs
    RETURN url ~ '^https://(drive\.google\.com/(file/d/[a-zA-Z0-9_-]+/(view|preview)|open\?id=[a-zA-Z0-9_-]+|drive/folders/[a-zA-Z0-9_-]+)|docs\.google\.com/(document|spreadsheets|presentation|forms)/d/[a-zA-Z0-9_-]+).*$';
END;
$_$;


ALTER FUNCTION "public"."is_valid_google_drive_url"("url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_valid_google_drive_url"("url" "text") IS 'Validates if a URL is a valid Google Drive URL. Supports files, folders, docs, sheets, slides, and forms.';



CREATE OR REPLACE FUNCTION "public"."log_task_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_history (task_id, user_id, action, metadata)
    VALUES (NEW.id, NEW.user_id, 'created', jsonb_build_object('task_name', NEW.name));
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.user_id, 'status_changed', 'status', OLD.status, NEW.status);
    END IF;
    -- Log priority changes
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.user_id, 'priority_changed', 'priority', OLD.priority, NEW.priority);
    END IF;
    -- Log assignment changes
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO task_history (task_id, user_id, action, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.assigned_by, 'assigned', 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO task_history (task_id, user_id, action, metadata)
    VALUES (OLD.id, OLD.user_id, 'deleted', jsonb_build_object('task_name', OLD.name));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_task_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."promote_user_to_section_admin"("input_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."promote_user_to_section_admin"("input_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."promote_user_to_section_admin"("input_user_id" "uuid") IS 'Securely promotes a user to section admin role, creates entry in section_admins table, and logs the action';



CREATE OR REPLACE FUNCTION "public"."register_with_section"("email" "text", "password" "text", "name" "text", "phone" "text", "student_id" "text", "department_uuid" "uuid", "batch_uuid" "uuid", "section_uuid" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
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
$_$;


ALTER FUNCTION "public"."register_with_section"("email" "text", "password" "text", "name" "text", "phone" "text", "student_id" "text", "department_uuid" "uuid", "batch_uuid" "uuid", "section_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_section_admin"("user_uuid" "uuid", "section_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."set_section_admin"("user_uuid" "uuid", "section_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_fcm_tokens_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_fcm_tokens_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lecture_slides_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lecture_slides_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_section"("user_uuid" "uuid", "department_uuid" "uuid", "batch_uuid" "uuid", "section_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."update_user_section"("user_uuid" "uuid", "department_uuid" "uuid", "batch_uuid" "uuid", "section_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_diu_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
BEGIN
  IF NEW.email !~ '@diu.edu.bd$' AND 
     NEW.email !~ '@admin.diu.edu.bd$' AND 
     NEW.email != 'superadmin@nesttask.com' THEN
    RAISE EXCEPTION 'Email must be from diu.edu.bd domain';
  END IF;
  RETURN NEW;
END;
$_$;


ALTER FUNCTION "public"."validate_diu_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_google_drive_links"("links" "text"[]) RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    link TEXT;
BEGIN
    -- Return true for empty arrays
    IF links IS NULL OR array_length(links, 1) IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check each link in the array
    FOREACH link IN ARRAY links
    LOOP
        IF NOT is_valid_google_drive_url(link) THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."validate_google_drive_links"("links" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_google_drive_links"("links" "text"[]) IS 'Validates an array of Google Drive URLs. Returns false if any URL is invalid.';



CREATE OR REPLACE FUNCTION "public"."validate_task_google_drive_links"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Only validate if google_drive_links is being set and is not empty
    IF NEW.google_drive_links IS NOT NULL AND array_length(NEW.google_drive_links, 1) > 0 THEN
        IF NOT validate_google_drive_links(NEW.google_drive_links) THEN
            RAISE EXCEPTION 'Invalid Google Drive URL detected in google_drive_links array';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_task_google_drive_links"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid" NOT NULL
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "teacher" "text" NOT NULL,
    "class_time" "text" NOT NULL,
    "telegram_group" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "blc_link" "text",
    "blc_enroll_key" "text",
    "teacher_id" "uuid",
    "credit" integer,
    "section" "text"
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fcm_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "device_info" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fcm_tokens_platform_check" CHECK (("platform" = ANY (ARRAY['android'::"text", 'ios'::"text", 'web'::"text"])))
);


ALTER TABLE "public"."fcm_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."fcm_tokens" IS 'Stores Firebase Cloud Messaging tokens for push notifications';



COMMENT ON COLUMN "public"."fcm_tokens"."token" IS 'FCM registration token from device';



COMMENT ON COLUMN "public"."fcm_tokens"."platform" IS 'Device platform: android, ios, or web';



COMMENT ON COLUMN "public"."fcm_tokens"."device_info" IS 'Optional device metadata (model, OS version, etc.)';



COMMENT ON COLUMN "public"."fcm_tokens"."is_active" IS 'Whether this token is still valid and should receive notifications';



CREATE TABLE IF NOT EXISTS "public"."lecture_slides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "section_id" "uuid",
    "file_urls" "text"[] DEFAULT ARRAY[]::"text"[],
    "original_file_names" "text"[] DEFAULT ARRAY[]::"text"[],
    "slide_links" "text"[] DEFAULT ARRAY[]::"text"[],
    "video_links" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lecture_slides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routine_slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid",
    "course_id" "uuid",
    "day_of_week" "text" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "room_number" "text",
    "section" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "teacher_id" "uuid",
    CONSTRAINT "valid_day_of_week" CHECK (("day_of_week" = ANY (ARRAY['Sunday'::"text", 'Monday'::"text", 'Tuesday'::"text", 'Wednesday'::"text", 'Thursday'::"text", 'Friday'::"text", 'Saturday'::"text"])))
);


ALTER TABLE "public"."routine_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "semester" "text" NOT NULL,
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."routines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."section_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "section_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."section_admins" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."section_admins_view" WITH ("security_invoker"='on') AS
 SELECT "sa"."id",
    "sa"."user_id",
    "u"."email",
    "u"."name",
    "s"."id" AS "section_id",
    "s"."name" AS "section_name",
    "b"."id" AS "batch_id",
    "b"."name" AS "batch_name",
    "d"."id" AS "department_id",
    "d"."name" AS "department_name",
    "sa"."created_at",
    "sa"."assigned_by"
   FROM (((("public"."section_admins" "sa"
     JOIN "public"."users" "u" ON (("sa"."user_id" = "u"."id")))
     JOIN "public"."sections" "s" ON (("sa"."section_id" = "s"."id")))
     JOIN "public"."batches" "b" ON (("s"."batch_id" = "b"."id")))
     JOIN "public"."departments" "d" ON (("b"."department_id" = "d"."id")));


ALTER VIEW "public"."section_admins_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."study_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "course_id" "uuid",
    "category" "text" NOT NULL,
    "file_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "original_file_names" "text"[] DEFAULT ARRAY[]::"text"[]
);


ALTER TABLE "public"."study_materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'assigned'::"text",
    "completed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_assignments_status_check" CHECK (("status" = ANY (ARRAY['assigned'::"text", 'accepted'::"text", 'in-progress'::"text", 'completed'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."task_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_assignments" IS 'Tracks user assignments for tasks with status tracking';



CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_edited" boolean DEFAULT false
);


ALTER TABLE "public"."task_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_comments" IS 'Discussion threads and comments on tasks';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "due_date" "date" NOT NULL,
    "description" "text" NOT NULL,
    "status" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_admin_task" boolean DEFAULT false,
    "section_id" "uuid",
    "google_drive_links" "text"[] DEFAULT '{}'::"text"[],
    "priority" "text" DEFAULT 'medium'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "assigned_to" "uuid",
    "assigned_by" "uuid",
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "attachments" "text"[] DEFAULT '{}'::"text"[],
    "is_template" boolean DEFAULT false,
    "template_name" "text",
    "department_id" "uuid",
    "batch_id" "uuid",
    "original_file_names" "text"[] DEFAULT ARRAY[]::"text"[],
    CONSTRAINT "tasks_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tasks"."section_id" IS 'Foreign key to sections table. Allows section-based task organization and access control.';



COMMENT ON COLUMN "public"."tasks"."google_drive_links" IS 'Array of Google Drive URLs attached to the task. Only section admins can add these links.';



COMMENT ON COLUMN "public"."tasks"."priority" IS 'Task priority level: low, medium, high, urgent';



COMMENT ON COLUMN "public"."tasks"."tags" IS 'Array of custom tags for task categorization';



COMMENT ON COLUMN "public"."tasks"."assigned_to" IS 'User currently assigned to the task';



COMMENT ON COLUMN "public"."tasks"."completed_at" IS 'Timestamp when task was marked completed';



COMMENT ON COLUMN "public"."tasks"."is_template" IS 'Whether this task is saved as a template';



COMMENT ON COLUMN "public"."tasks"."department_id" IS 'Auto-populated from section hierarchy. Denormalized for query performance.';



COMMENT ON COLUMN "public"."tasks"."batch_id" IS 'Auto-populated from section hierarchy. Denormalized for query performance.';



COMMENT ON COLUMN "public"."tasks"."original_file_names" IS 'Array of original file names corresponding to attachments array';



CREATE OR REPLACE VIEW "public"."task_details_view" AS
 SELECT "t"."id",
    "t"."name",
    "t"."category",
    "t"."due_date",
    "t"."description",
    "t"."status",
    "t"."user_id",
    "t"."created_at",
    "t"."is_admin_task",
    "t"."section_id",
    "t"."google_drive_links",
    "t"."priority",
    "t"."tags",
    "t"."assigned_to",
    "t"."assigned_by",
    "t"."completed_at",
    "t"."completed_by",
    "t"."updated_at",
    "t"."attachments",
    "t"."is_template",
    "t"."template_name",
    "t"."department_id",
    "t"."batch_id",
    "u"."name" AS "user_name",
    "u"."email" AS "user_email",
    "au"."name" AS "assigned_to_name",
    "au"."email" AS "assigned_to_email",
    "abu"."name" AS "assigned_by_name",
    "s"."name" AS "section_name",
    "b"."name" AS "batch_name",
    "d"."name" AS "department_name"
   FROM (((((("public"."tasks" "t"
     LEFT JOIN "public"."users" "u" ON (("u"."id" = "t"."user_id")))
     LEFT JOIN "public"."users" "au" ON (("au"."id" = "t"."assigned_to")))
     LEFT JOIN "public"."users" "abu" ON (("abu"."id" = "t"."assigned_by")))
     LEFT JOIN "public"."sections" "s" ON (("s"."id" = "t"."section_id")))
     LEFT JOIN "public"."batches" "b" ON (("b"."id" = "t"."batch_id")))
     LEFT JOIN "public"."departments" "d" ON (("d"."id" = "t"."department_id")));


ALTER VIEW "public"."task_details_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "field_name" "text",
    "old_value" "text",
    "new_value" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."task_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_history" IS 'Audit trail of all task changes';



CREATE TABLE IF NOT EXISTS "public"."task_reminder_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "reminder_date" "date" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "recipients_count" integer DEFAULT 0,
    "status" "text" DEFAULT 'sent'::"text",
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "task_reminder_logs_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."task_reminder_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_reminder_logs" IS 'Tracks task due date reminder notifications to prevent duplicates';



CREATE TABLE IF NOT EXISTS "public"."task_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "category" "text" NOT NULL,
    "priority" "text" DEFAULT 'medium'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "default_due_days" integer DEFAULT 7,
    "section_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "use_count" integer DEFAULT 0,
    CONSTRAINT "task_templates_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."task_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_templates" IS 'Reusable task templates for quick task creation';



CREATE TABLE IF NOT EXISTS "public"."teacher_courses" (
    "teacher_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teacher_courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teachers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text" NOT NULL,
    "department" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."teachers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "action" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_activities" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."users_with_full_info" AS
 SELECT "u"."id",
    "u"."email",
    "u"."name",
    "u"."role",
    "u"."phone",
    "u"."student_id" AS "studentId",
    "u"."department_id" AS "departmentId",
    "d"."name" AS "departmentName",
    "u"."batch_id" AS "batchId",
    "b"."name" AS "batchName",
    "u"."section_id" AS "sectionId",
    "s"."name" AS "sectionName",
    "u"."created_at" AS "createdAt",
    "u"."last_active" AS "lastActive"
   FROM ((("public"."users" "u"
     LEFT JOIN "public"."departments" "d" ON (("u"."department_id" = "d"."id")))
     LEFT JOIN "public"."batches" "b" ON (("u"."batch_id" = "b"."id")))
     LEFT JOIN "public"."sections" "s" ON (("u"."section_id" = "s"."id")));


ALTER VIEW "public"."users_with_full_info" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_name_department_id_key" UNIQUE ("name", "department_id");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fcm_tokens"
    ADD CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lecture_slides"
    ADD CONSTRAINT "lecture_slides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routine_slots"
    ADD CONSTRAINT "routine_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."section_admins"
    ADD CONSTRAINT "section_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."section_admins"
    ADD CONSTRAINT "section_admins_user_id_section_id_key" UNIQUE ("user_id", "section_id");



ALTER TABLE ONLY "public"."section_routines"
    ADD CONSTRAINT "section_routines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_name_batch_id_key" UNIQUE ("name", "batch_id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."study_materials"
    ADD CONSTRAINT "study_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_task_id_user_id_key" UNIQUE ("task_id", "user_id");



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_reminder_logs"
    ADD CONSTRAINT "task_reminder_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_reminder_logs"
    ADD CONSTRAINT "task_reminder_logs_task_id_reminder_date_key" UNIQUE ("task_id", "reminder_date");



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_courses"
    ADD CONSTRAINT "teacher_courses_pkey" PRIMARY KEY ("teacher_id", "course_id");



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_courses_code" ON "public"."courses" USING "btree" ("code");



CREATE INDEX "idx_fcm_tokens_active" ON "public"."fcm_tokens" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE UNIQUE INDEX "idx_fcm_tokens_token" ON "public"."fcm_tokens" USING "btree" ("token");



CREATE INDEX "idx_fcm_tokens_user_id" ON "public"."fcm_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_lecture_slides_created_at" ON "public"."lecture_slides" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lecture_slides_created_by" ON "public"."lecture_slides" USING "btree" ("created_by");



CREATE INDEX "idx_lecture_slides_section_id" ON "public"."lecture_slides" USING "btree" ("section_id");



CREATE INDEX "idx_routine_slots_course" ON "public"."routine_slots" USING "btree" ("course_id");



CREATE INDEX "idx_routine_slots_day" ON "public"."routine_slots" USING "btree" ("day_of_week");



CREATE INDEX "idx_routine_slots_routine" ON "public"."routine_slots" USING "btree" ("routine_id");



CREATE INDEX "idx_routine_slots_teacher" ON "public"."routine_slots" USING "btree" ("teacher_id");



CREATE INDEX "idx_study_materials_category" ON "public"."study_materials" USING "btree" ("category");



CREATE INDEX "idx_study_materials_course" ON "public"."study_materials" USING "btree" ("course_id");



CREATE INDEX "idx_study_materials_course_id" ON "public"."study_materials" USING "btree" ("course_id");



CREATE INDEX "idx_task_assignments_task_id" ON "public"."task_assignments" USING "btree" ("task_id");



CREATE INDEX "idx_task_assignments_user_id" ON "public"."task_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_task_comments_task_id" ON "public"."task_comments" USING "btree" ("task_id");



CREATE INDEX "idx_task_history_task_id" ON "public"."task_history" USING "btree" ("task_id");



CREATE INDEX "idx_task_reminder_logs_reminder_date" ON "public"."task_reminder_logs" USING "btree" ("reminder_date");



CREATE INDEX "idx_task_reminder_logs_sent_at" ON "public"."task_reminder_logs" USING "btree" ("sent_at");



CREATE INDEX "idx_task_reminder_logs_task_id" ON "public"."task_reminder_logs" USING "btree" ("task_id");



CREATE INDEX "idx_task_templates_section_id" ON "public"."task_templates" USING "btree" ("section_id");



CREATE INDEX "idx_tasks_admin_flag" ON "public"."tasks" USING "btree" ("is_admin_task") WHERE ("is_admin_task" = true);



CREATE INDEX "idx_tasks_assigned_to" ON "public"."tasks" USING "btree" ("assigned_to");



CREATE INDEX "idx_tasks_batch_id" ON "public"."tasks" USING "btree" ("batch_id");



CREATE INDEX "idx_tasks_created_at" ON "public"."tasks" USING "btree" ("created_at");



CREATE INDEX "idx_tasks_department_id" ON "public"."tasks" USING "btree" ("department_id");



CREATE INDEX "idx_tasks_due_date" ON "public"."tasks" USING "btree" ("due_date");



CREATE INDEX "idx_tasks_original_file_names" ON "public"."tasks" USING "gin" ("original_file_names");



CREATE INDEX "idx_tasks_priority" ON "public"."tasks" USING "btree" ("priority");



CREATE INDEX "idx_tasks_section_due_date" ON "public"."tasks" USING "btree" ("section_id", "due_date") WHERE ("section_id" IS NOT NULL);



CREATE INDEX "idx_tasks_section_id" ON "public"."tasks" USING "btree" ("section_id");



CREATE INDEX "idx_tasks_status" ON "public"."tasks" USING "btree" ("status");



CREATE INDEX "idx_tasks_tags" ON "public"."tasks" USING "gin" ("tags");



CREATE INDEX "idx_tasks_user_due_date" ON "public"."tasks" USING "btree" ("user_id", "due_date");



CREATE INDEX "idx_teacher_courses_course" ON "public"."teacher_courses" USING "btree" ("course_id");



CREATE INDEX "idx_teacher_courses_teacher" ON "public"."teacher_courses" USING "btree" ("teacher_id");



CREATE INDEX "idx_teachers_name" ON "public"."teachers" USING "btree" ("name");



CREATE INDEX "idx_user_activities_type" ON "public"."user_activities" USING "btree" ("activity_type");



CREATE INDEX "idx_user_activities_user_id" ON "public"."user_activities" USING "btree" ("user_id");



CREATE INDEX "tasks_google_drive_links_idx" ON "public"."tasks" USING "gin" ("google_drive_links");



CREATE INDEX "tasks_section_id_idx" ON "public"."tasks" USING "btree" ("section_id");



CREATE OR REPLACE TRIGGER "auto_populate_task_hierarchy_trigger" BEFORE INSERT OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."auto_populate_task_hierarchy"();



CREATE OR REPLACE TRIGGER "log_task_changes_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."log_task_changes"();



CREATE OR REPLACE TRIGGER "on_user_profile_update" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_profile_update"();



CREATE OR REPLACE TRIGGER "on_user_upsert" BEFORE INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_user_upsert"();



CREATE OR REPLACE TRIGGER "task_activity_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."handle_task_activity"();



CREATE OR REPLACE TRIGGER "trigger_auto_assign_task" AFTER INSERT ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_task_to_section_users"();



CREATE OR REPLACE TRIGGER "trigger_fcm_tokens_updated_at" BEFORE UPDATE ON "public"."fcm_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_fcm_tokens_updated_at"();



CREATE OR REPLACE TRIGGER "update_lecture_slides_updated_at_trigger" BEFORE UPDATE ON "public"."lecture_slides" FOR EACH ROW EXECUTE FUNCTION "public"."update_lecture_slides_updated_at"();



CREATE OR REPLACE TRIGGER "update_task_comments_updated_at" BEFORE UPDATE ON "public"."task_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_task_templates_updated_at" BEFORE UPDATE ON "public"."task_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_google_drive_links_trigger" BEFORE INSERT OR UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."validate_task_google_drive_links"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_user_id_users_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fcm_tokens"
    ADD CONSTRAINT "fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lecture_slides"
    ADD CONSTRAINT "lecture_slides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lecture_slides"
    ADD CONSTRAINT "lecture_slides_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_slots"
    ADD CONSTRAINT "routine_slots_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_slots"
    ADD CONSTRAINT "routine_slots_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_slots"
    ADD CONSTRAINT "routine_slots_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."section_admins"
    ADD CONSTRAINT "section_admins_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."section_admins"
    ADD CONSTRAINT "section_admins_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."section_admins"
    ADD CONSTRAINT "section_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."section_routines"
    ADD CONSTRAINT "section_routines_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."section_routines"
    ADD CONSTRAINT "section_routines_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."study_materials"
    ADD CONSTRAINT "study_materials_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."study_materials"
    ADD CONSTRAINT "study_materials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_assignments"
    ADD CONSTRAINT "task_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_comments"
    ADD CONSTRAINT "task_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_reminder_logs"
    ADD CONSTRAINT "task_reminder_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_templates"
    ADD CONSTRAINT "task_templates_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_courses"
    ADD CONSTRAINT "teacher_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_courses"
    ADD CONSTRAINT "teacher_courses_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teachers"
    ADD CONSTRAINT "teachers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activities"
    ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id");



CREATE POLICY "Admins can manage all task assignments" ON "public"."task_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'super-admin'::"text"]))))));



CREATE POLICY "Admins can manage all templates" ON "public"."task_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'super-admin'::"text"]))))));



CREATE POLICY "Admins can view all tokens" ON "public"."fcm_tokens" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'section_admin'::"text", 'super-admin'::"text"]))))));



COMMENT ON POLICY "Admins can view all tokens" ON "public"."fcm_tokens" IS 'Allows admins, section admins, and super admins to view all FCM tokens for management';



CREATE POLICY "Allow admins to manage activities" ON "public"."activities" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow admins to manage announcements" ON "public"."announcements" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Allow public read access to batches" ON "public"."batches" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to departments" ON "public"."departments" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to sections" ON "public"."sections" FOR SELECT USING (true);



CREATE POLICY "Allow super_admin full access to batches" ON "public"."batches" USING ((("auth"."jwt"() ->> 'role'::"text") = 'super-admin'::"text"));



CREATE POLICY "Allow super_admin full access to departments" ON "public"."departments" USING ((("auth"."jwt"() ->> 'role'::"text") = 'super-admin'::"text"));



CREATE POLICY "Allow super_admin full access to sections" ON "public"."sections" USING ((("auth"."jwt"() ->> 'role'::"text") = 'super-admin'::"text"));



CREATE POLICY "Allow users to read activities" ON "public"."activities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow users to read announcements" ON "public"."announcements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable delete for admin users" ON "public"."study_materials" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Enable delete for admin users on courses" ON "public"."courses" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Enable delete for admin users on routine_slots" ON "public"."routine_slots" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Enable delete for admin users on routines" ON "public"."routines" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Enable delete for admin users on study_materials" ON "public"."study_materials" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Enable delete for admin users on teacher_courses" ON "public"."teacher_courses" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Enable delete for admin users on teachers" ON "public"."teachers" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Enable delete for admins" ON "public"."users" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "auth"."users" "users_1"
  WHERE (("users_1"."id" = "auth"."uid"()) AND (("users_1"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Enable insert for admin users" ON "public"."study_materials" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable insert for admin users on courses" ON "public"."courses" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable insert for admin users on routine_slots" ON "public"."routine_slots" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable insert for admin users on routines" ON "public"."routines" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable insert for admin users on study_materials" ON "public"."study_materials" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable insert for admin users on teacher_courses" ON "public"."teacher_courses" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable insert for admin users on teachers" ON "public"."teachers" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable read access for all authenticated users" ON "public"."study_materials" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users on courses" ON "public"."courses" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users on routine_slots" ON "public"."routine_slots" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users on routines" ON "public"."routines" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users on study_materia" ON "public"."study_materials" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users on teacher_cours" ON "public"."teacher_courses" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all authenticated users on teachers" ON "public"."teachers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable self-insert" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable update for admin users" ON "public"."study_materials" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable update for admin users on courses" ON "public"."courses" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable update for admin users on routine_slots" ON "public"."routine_slots" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable update for admin users on routines" ON "public"."routines" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable update for admin users on study_materials" ON "public"."study_materials" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable update for admin users on teacher_courses" ON "public"."teacher_courses" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Enable update for admin users on teachers" ON "public"."teachers" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Section admins can manage lecture slides for their section" ON "public"."lecture_slides" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'section_admin'::"text") AND ("u"."section_id" = "lecture_slides"."section_id")))));



CREATE POLICY "Section admins can manage task assignments in their section" ON "public"."task_assignments" USING ((EXISTS ( SELECT 1
   FROM ("public"."section_admins" "sa"
     JOIN "public"."tasks" "t" ON (("t"."section_id" = "sa"."section_id")))
  WHERE (("sa"."user_id" = "auth"."uid"()) AND ("t"."id" = "task_assignments"."task_id")))));



CREATE POLICY "Section admins can manage templates in their section" ON "public"."task_templates" USING ((EXISTS ( SELECT 1
   FROM "public"."section_admins"
  WHERE (("section_admins"."user_id" = "auth"."uid"()) AND ("section_admins"."section_id" = "task_templates"."section_id")))));



CREATE POLICY "Section admins can manage their section's routines" ON "public"."section_routines" USING ((((("auth"."jwt"() ->> 'role'::"text") = 'section_admin'::"text") AND ("section_id" = ( SELECT "users"."section_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))) OR (("auth"."jwt"() ->> 'role'::"text") = 'super-admin'::"text")));



CREATE POLICY "Service role can manage all tokens" ON "public"."fcm_tokens" TO "service_role" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Service role can manage all tokens" ON "public"."fcm_tokens" IS 'Allows edge functions with service role to send push notifications';



CREATE POLICY "Service role full access" ON "public"."task_reminder_logs" USING (true) WITH CHECK (true);



CREATE POLICY "Super admins can manage all lecture slides" ON "public"."lecture_slides" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'super-admin'::"text")))));



CREATE POLICY "Super admins can manage all routines" ON "public"."section_routines" USING ((("auth"."jwt"() ->> 'role'::"text") = 'super-admin'::"text"));



CREATE POLICY "Users can create comments on tasks they have access to" ON "public"."task_comments" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."tasks"
  WHERE (("tasks"."id" = "task_comments"."task_id") AND (("tasks"."user_id" = "auth"."uid"()) OR ("tasks"."assigned_to" = "auth"."uid"()) OR ("tasks"."section_id" IN ( SELECT "users"."section_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"())))))))));



CREATE POLICY "Users can delete own FCM tokens" ON "public"."fcm_tokens" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments" ON "public"."task_comments" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own FCM tokens" ON "public"."fcm_tokens" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own activities" ON "public"."user_activities" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can see their own data" ON "public"."users" FOR SELECT USING ((("auth"."uid"() = "id") OR (("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['section-admin'::"text", 'admin'::"text", 'super-admin'::"text"]))));



CREATE POLICY "Users can update own FCM tokens" ON "public"."fcm_tokens" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own comments" ON "public"."task_comments" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view comments on tasks they have access to" ON "public"."task_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tasks"
  WHERE (("tasks"."id" = "task_comments"."task_id") AND (("tasks"."user_id" = "auth"."uid"()) OR ("tasks"."assigned_to" = "auth"."uid"()) OR ("tasks"."section_id" IN ( SELECT "users"."section_id"
           FROM "public"."users"
          WHERE ("users"."id" = "auth"."uid"()))))))));



CREATE POLICY "Users can view lecture slides from their section" ON "public"."lecture_slides" FOR SELECT TO "authenticated" USING (("section_id" IN ( SELECT "u"."section_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own FCM tokens" ON "public"."fcm_tokens" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view templates in their section" ON "public"."task_templates" FOR SELECT USING ((("section_id" IN ( SELECT "users"."section_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR ("section_id" IS NULL)));



CREATE POLICY "Users can view their own activities" ON "public"."user_activities" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own task assignments" ON "public"."task_assignments" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("assigned_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."tasks"
  WHERE (("tasks"."id" = "task_assignments"."task_id") AND ("tasks"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their section's routines" ON "public"."section_routines" FOR SELECT USING ((("section_id" = ( SELECT "users"."section_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))) OR (("auth"."jwt"() ->> 'role'::"text") = 'section_admin'::"text") OR (("auth"."jwt"() ->> 'role'::"text") = 'super-admin'::"text")));



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fcm_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lecture_slides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."routine_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."routines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."section_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "section_admins_manage_super_admin" ON "public"."section_admins" TO "authenticated" USING ("public"."is_app_super_admin"()) WITH CHECK ("public"."is_app_super_admin"());



CREATE POLICY "section_admins_select_own_or_admin" ON "public"."section_admins" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_app_admin"()));



ALTER TABLE "public"."section_routines" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."study_materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_assignments_insert_policy" ON "public"."task_assignments" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "task_assignments_select_policy" ON "public"."task_assignments" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("assigned_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'super-admin'::"text"])))))));



ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_history_insert_policy" ON "public"."task_history" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "task_history_select_policy" ON "public"."task_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tasks"
  WHERE (("tasks"."id" = "task_history"."task_id") AND (("tasks"."user_id" = "auth"."uid"()) OR ("tasks"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."users"
          WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'super-admin'::"text"]))))))))));



ALTER TABLE "public"."task_reminder_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_delete_policy_v3" ON "public"."tasks" FOR DELETE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR "public"."is_app_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."section_admins" "sa"
  WHERE (("sa"."user_id" = "auth"."uid"()) AND ("sa"."section_id" = "tasks"."section_id"))))));



CREATE POLICY "tasks_insert_policy_v3" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user_id") OR "public"."is_app_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."section_admins" "sa"
  WHERE (("sa"."user_id" = "auth"."uid"()) AND ("sa"."section_id" = "tasks"."section_id"))))));



CREATE POLICY "tasks_select_policy_v3" ON "public"."tasks" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "assigned_to") OR (("public"."current_user_section_id"() IS NOT NULL) AND ("section_id" = "public"."current_user_section_id"())) OR "public"."is_app_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."section_admins" "sa"
  WHERE (("sa"."user_id" = "auth"."uid"()) AND ("sa"."section_id" = "tasks"."section_id"))))));



CREATE POLICY "tasks_update_policy_v3" ON "public"."tasks" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "assigned_to") OR "public"."is_app_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."section_admins" "sa"
  WHERE (("sa"."user_id" = "auth"."uid"()) AND ("sa"."section_id" = "tasks"."section_id")))))) WITH CHECK ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = "assigned_to") OR "public"."is_app_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."section_admins" "sa"
  WHERE (("sa"."user_id" = "auth"."uid"()) AND ("sa"."section_id" = "tasks"."section_id"))))));



ALTER TABLE "public"."teacher_courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teachers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_delete_super_admin_all" ON "public"."users" FOR DELETE TO "authenticated" USING ("public"."is_app_super_admin"());



CREATE POLICY "users_read_own" ON "public"."users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "users_select_admin_department" ON "public"."users" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'admin'::"text") AND (("public"."current_user_department_id"() = "department_id") OR ("department_id" IS NULL))));



CREATE POLICY "users_select_section_admin_section" ON "public"."users" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'section_admin'::"text") AND (("public"."current_user_section_id"() = "section_id") OR ("section_id" IS NULL))));



CREATE POLICY "users_select_super_admin_all" ON "public"."users" FOR SELECT TO "authenticated" USING ("public"."is_app_super_admin"());



CREATE POLICY "users_update_admin_department" ON "public"."users" FOR UPDATE TO "authenticated" USING ((("public"."current_user_role"() = 'admin'::"text") AND ("public"."current_user_department_id"() = "department_id"))) WITH CHECK ((("public"."current_user_role"() = 'admin'::"text") AND ("public"."current_user_department_id"() = "department_id")));



CREATE POLICY "users_update_own" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_update_super_admin_all" ON "public"."users" FOR UPDATE TO "authenticated" USING ("public"."is_app_super_admin"()) WITH CHECK ("public"."is_app_super_admin"());





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tasks";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."users";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."auto_assign_task_to_section_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_task_to_section_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_task_to_section_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_confirm_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_confirm_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_confirm_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_populate_task_hierarchy"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_populate_task_hierarchy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_populate_task_hierarchy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_admin_exists"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_admin_exists"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_admin_exists"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_section_routine"("title" "text", "schedule" "jsonb", "section_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_section_routine"("title" "text", "schedule" "jsonb", "section_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_section_routine"("title" "text", "schedule" "jsonb", "section_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_section_task"("title" "text", "description" "text", "due_date" timestamp with time zone, "section_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_section_task"("title" "text", "description" "text", "due_date" timestamp with time zone, "section_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_section_task"("title" "text", "description" "text", "due_date" timestamp with time zone, "section_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_department_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_department_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_department_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_user_section_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_section_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_section_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_user_data"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_user_data"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_user_data"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_with_section"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_with_section"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_with_section"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_stats"() TO "service_role";



GRANT ALL ON TABLE "public"."section_routines" TO "anon";
GRANT ALL ON TABLE "public"."section_routines" TO "authenticated";
GRANT ALL ON TABLE "public"."section_routines" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_section_routines"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_section_routines"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_section_routines"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_section_details"("section_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_section_details"("section_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_section_details"("section_uuid" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."batches" TO "anon";
GRANT ALL ON TABLE "public"."batches" TO "authenticated";
GRANT ALL ON TABLE "public"."batches" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."sections" TO "anon";
GRANT ALL ON TABLE "public"."sections" TO "authenticated";
GRANT ALL ON TABLE "public"."sections" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."users_with_sections" TO "anon";
GRANT ALL ON TABLE "public"."users_with_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."users_with_sections" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_section_users"("section_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_section_users"("section_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_section_users"("section_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_task_statistics"("p_section_id" "uuid", "p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_task_statistics"("p_section_id" "uuid", "p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_task_statistics"("p_section_id" "uuid", "p_user_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_task_statistics_optimized"("p_section_id" "uuid", "p_user_id" "uuid", "p_department_id" "uuid", "p_batch_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_task_statistics_optimized"("p_section_id" "uuid", "p_user_id" "uuid", "p_department_id" "uuid", "p_batch_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_task_statistics_optimized"("p_section_id" "uuid", "p_user_id" "uuid", "p_department_id" "uuid", "p_batch_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_task_performance"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_task_performance"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_task_performance"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_task_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_task_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_task_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_profile_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_profile_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_profile_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_upsert"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_upsert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_upsert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_section_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_section_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_section_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_app_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_app_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_app_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_app_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_app_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_app_super_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_section_admin"("section_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_section_admin"("section_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_section_admin"("section_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_valid_google_drive_url"("url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."is_valid_google_drive_url"("url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_valid_google_drive_url"("url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_task_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_task_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_task_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."promote_user_to_section_admin"("input_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."promote_user_to_section_admin"("input_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."promote_user_to_section_admin"("input_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_with_section"("email" "text", "password" "text", "name" "text", "phone" "text", "student_id" "text", "department_uuid" "uuid", "batch_uuid" "uuid", "section_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."register_with_section"("email" "text", "password" "text", "name" "text", "phone" "text", "student_id" "text", "department_uuid" "uuid", "batch_uuid" "uuid", "section_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_with_section"("email" "text", "password" "text", "name" "text", "phone" "text", "student_id" "text", "department_uuid" "uuid", "batch_uuid" "uuid", "section_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_section_admin"("user_uuid" "uuid", "section_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_section_admin"("user_uuid" "uuid", "section_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_section_admin"("user_uuid" "uuid", "section_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_fcm_tokens_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_fcm_tokens_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_fcm_tokens_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lecture_slides_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lecture_slides_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lecture_slides_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_section"("user_uuid" "uuid", "department_uuid" "uuid", "batch_uuid" "uuid", "section_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_section"("user_uuid" "uuid", "department_uuid" "uuid", "batch_uuid" "uuid", "section_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_section"("user_uuid" "uuid", "department_uuid" "uuid", "batch_uuid" "uuid", "section_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_diu_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_diu_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_diu_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_google_drive_links"("links" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_google_drive_links"("links" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_google_drive_links"("links" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_task_google_drive_links"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_task_google_drive_links"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_task_google_drive_links"() TO "service_role";
























GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."fcm_tokens" TO "anon";
GRANT ALL ON TABLE "public"."fcm_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."fcm_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."lecture_slides" TO "anon";
GRANT ALL ON TABLE "public"."lecture_slides" TO "authenticated";
GRANT ALL ON TABLE "public"."lecture_slides" TO "service_role";



GRANT ALL ON TABLE "public"."routine_slots" TO "anon";
GRANT ALL ON TABLE "public"."routine_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."routine_slots" TO "service_role";



GRANT ALL ON TABLE "public"."routines" TO "anon";
GRANT ALL ON TABLE "public"."routines" TO "authenticated";
GRANT ALL ON TABLE "public"."routines" TO "service_role";



GRANT ALL ON TABLE "public"."section_admins" TO "anon";
GRANT ALL ON TABLE "public"."section_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."section_admins" TO "service_role";



GRANT ALL ON TABLE "public"."section_admins_view" TO "anon";
GRANT ALL ON TABLE "public"."section_admins_view" TO "authenticated";
GRANT ALL ON TABLE "public"."section_admins_view" TO "service_role";



GRANT ALL ON TABLE "public"."study_materials" TO "anon";
GRANT ALL ON TABLE "public"."study_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."study_materials" TO "service_role";



GRANT ALL ON TABLE "public"."task_assignments" TO "anon";
GRANT ALL ON TABLE "public"."task_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."task_details_view" TO "anon";
GRANT ALL ON TABLE "public"."task_details_view" TO "authenticated";
GRANT ALL ON TABLE "public"."task_details_view" TO "service_role";



GRANT ALL ON TABLE "public"."task_history" TO "anon";
GRANT ALL ON TABLE "public"."task_history" TO "authenticated";
GRANT ALL ON TABLE "public"."task_history" TO "service_role";



GRANT ALL ON TABLE "public"."task_reminder_logs" TO "anon";
GRANT ALL ON TABLE "public"."task_reminder_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."task_reminder_logs" TO "service_role";



GRANT ALL ON TABLE "public"."task_templates" TO "anon";
GRANT ALL ON TABLE "public"."task_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."task_templates" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_courses" TO "anon";
GRANT ALL ON TABLE "public"."teacher_courses" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_courses" TO "service_role";



GRANT ALL ON TABLE "public"."teachers" TO "anon";
GRANT ALL ON TABLE "public"."teachers" TO "authenticated";
GRANT ALL ON TABLE "public"."teachers" TO "service_role";



GRANT ALL ON TABLE "public"."user_activities" TO "anon";
GRANT ALL ON TABLE "public"."user_activities" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activities" TO "service_role";



GRANT ALL ON TABLE "public"."users_with_full_info" TO "anon";
GRANT ALL ON TABLE "public"."users_with_full_info" TO "authenticated";
GRANT ALL ON TABLE "public"."users_with_full_info" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































