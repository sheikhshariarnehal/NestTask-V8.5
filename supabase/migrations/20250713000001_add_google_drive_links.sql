/*
  # Add Google Drive Links Support to Tasks

  1. Schema Changes
    - Add google_drive_links column to tasks table
    - Create index for efficient querying

  2. Security
    - Maintain existing RLS policies
    - Google Drive links are subject to same access controls as tasks

  3. Features
    - Support for multiple Google Drive links per task
    - Links stored as TEXT array for flexibility
    - Only section admins can attach Google Drive links (enforced at application level)

  4. Validation
    - Server-side URL validation function
    - Comprehensive Google Drive URL pattern matching
*/

-- Add google_drive_links column to tasks if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'google_drive_links'
    ) THEN
        ALTER TABLE tasks ADD COLUMN google_drive_links TEXT[] DEFAULT '{}';
        CREATE INDEX IF NOT EXISTS tasks_google_drive_links_idx ON tasks USING GIN(google_drive_links);

        -- Add comment to document the column
        COMMENT ON COLUMN tasks.google_drive_links IS 'Array of Google Drive URLs attached to the task. Only section admins can add these links.';

        -- Log the addition
        RAISE NOTICE 'Added google_drive_links column to tasks table';
    ELSE
        RAISE NOTICE 'google_drive_links column already exists in tasks table';
    END IF;
END
$$;

-- Create a comprehensive function to validate Google Drive URLs
CREATE OR REPLACE FUNCTION is_valid_google_drive_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Return false for null or empty URLs
    IF url IS NULL OR trim(url) = '' THEN
        RETURN FALSE;
    END IF;

    -- Comprehensive validation for Google Drive URLs
    RETURN url ~ '^https://(drive\.google\.com/(file/d/[a-zA-Z0-9_-]+/(view|preview)|open\?id=[a-zA-Z0-9_-]+|drive/folders/[a-zA-Z0-9_-]+)|docs\.google\.com/(document|spreadsheets|presentation|forms)/d/[a-zA-Z0-9_-]+).*$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to validate an array of Google Drive URLs
CREATE OR REPLACE FUNCTION validate_google_drive_links(links TEXT[])
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comments to document the functions
COMMENT ON FUNCTION is_valid_google_drive_url(TEXT) IS 'Validates if a URL is a valid Google Drive URL. Supports files, folders, docs, sheets, slides, and forms.';
COMMENT ON FUNCTION validate_google_drive_links(TEXT[]) IS 'Validates an array of Google Drive URLs. Returns false if any URL is invalid.';

-- Create a trigger function to validate Google Drive links before insert/update
CREATE OR REPLACE FUNCTION validate_task_google_drive_links()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate if google_drive_links is being set and is not empty
    IF NEW.google_drive_links IS NOT NULL AND array_length(NEW.google_drive_links, 1) > 0 THEN
        IF NOT validate_google_drive_links(NEW.google_drive_links) THEN
            RAISE EXCEPTION 'Invalid Google Drive URL detected in google_drive_links array';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger (only if the column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'google_drive_links'
    ) THEN
        -- Drop existing trigger if it exists
        DROP TRIGGER IF EXISTS validate_google_drive_links_trigger ON tasks;

        -- Create new trigger
        CREATE TRIGGER validate_google_drive_links_trigger
            BEFORE INSERT OR UPDATE ON tasks
            FOR EACH ROW
            EXECUTE FUNCTION validate_task_google_drive_links();

        RAISE NOTICE 'Created validation trigger for google_drive_links';
    END IF;
END
$$;
