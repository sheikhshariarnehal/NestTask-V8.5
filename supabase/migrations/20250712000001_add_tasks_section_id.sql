/*
  # Add Section ID Support to Tasks

  1. Schema Changes
    - Add section_id column to tasks table with foreign key to sections
    - Create index for efficient querying

  2. Helper Functions
    - is_section_admin: Check if user is section admin for specific section
    - is_admin_or_section_admin: Check if user has admin privileges

  3. Security Policies
    - Update RLS policies to support section-based access control
    - Section admins can manage tasks in their sections
    - Users can view tasks in their sections
*/

-- Add section_id column to tasks if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'section_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN section_id UUID REFERENCES sections(id);
        CREATE INDEX IF NOT EXISTS tasks_section_id_idx ON tasks(section_id);

        -- Add comment to document the column
        COMMENT ON COLUMN tasks.section_id IS 'Foreign key to sections table. Allows section-based task organization and access control.';
    END IF;
END
$$;

-- Create function to check if user is section admin
CREATE OR REPLACE FUNCTION is_section_admin(section_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check both section_admins table and users table with role
    RETURN EXISTS (
        SELECT 1 FROM section_admins
        WHERE user_id = auth.uid()
        AND section_id = section_uuid
    ) OR EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'section_admin'
        AND section_id = section_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is admin or section admin
CREATE OR REPLACE FUNCTION is_admin_or_section_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role IN ('admin', 'section_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document the functions
COMMENT ON FUNCTION is_section_admin(UUID) IS 'Checks if the current user is a section admin for the specified section';
COMMENT ON FUNCTION is_admin_or_section_admin() IS 'Checks if the current user has admin or section admin privileges';

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
    -- Drop all existing task policies
    DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can view their own tasks or section tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can create tasks for themselves or for their section if admin" ON tasks;
    DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can update their own tasks or section tasks if admin" ON tasks;
    DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can delete their own tasks or section tasks if admin" ON tasks;
EXCEPTION
    WHEN undefined_object THEN
        -- Policies don't exist, continue
        NULL;
END
$$;

-- Create new SELECT policy
CREATE POLICY "Users can view their own tasks or section tasks" ON tasks
FOR SELECT USING (
    auth.uid() = user_id
    OR (
        section_id IN (
            SELECT section_id FROM users
            WHERE id = auth.uid()
        )
    )
    OR (
        -- Allow admins to view all tasks
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- Create new INSERT policy
CREATE POLICY "Users can create tasks for themselves or for their section if admin" ON tasks
FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR (
        is_section_admin(section_id)
    )
    OR (
        -- Allow global admins to create tasks for any section
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- Create new UPDATE policy
CREATE POLICY "Users can update their own tasks or section tasks if admin" ON tasks
FOR UPDATE USING (
    auth.uid() = user_id
    OR (
        is_section_admin(section_id)
    )
    OR (
        -- Allow global admins to update any task
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
) WITH CHECK (
    auth.uid() = user_id
    OR (
        is_section_admin(section_id)
    )
    OR (
        -- Allow global admins to update any task
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- Create new DELETE policy
CREATE POLICY "Users can delete their own tasks or section tasks if admin" ON tasks
FOR DELETE USING (
    auth.uid() = user_id
    OR (
        is_section_admin(section_id)
    )
    OR (
        -- Allow global admins to delete any task
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- Ensure RLS is enabled on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;