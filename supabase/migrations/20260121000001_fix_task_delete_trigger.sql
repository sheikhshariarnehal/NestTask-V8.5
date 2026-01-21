-- Fix task delete trigger that causes foreign key violation
-- The issue: log_task_changes trigger runs AFTER DELETE and tries to INSERT into task_history
-- with the deleted task_id, but the FK constraint fails since the task no longer exists.

-- Solution: Modify the trigger function to skip logging for DELETE operations
-- since we can't log a reference to a deleted record with FK constraints.

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
  END IF;
  -- NOTE: DELETE operations are not logged because the task_history table has a FK constraint
  -- to tasks.id, and we cannot insert a reference to a deleted task.
  -- The ON DELETE CASCADE on task_history_task_id_fkey will clean up existing history.
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Also update the trigger to only fire on INSERT and UPDATE, not DELETE
DROP TRIGGER IF EXISTS "log_task_changes_trigger" ON "public"."tasks";

CREATE TRIGGER "log_task_changes_trigger" 
  AFTER INSERT OR UPDATE ON "public"."tasks" 
  FOR EACH ROW 
  EXECUTE FUNCTION "public"."log_task_changes"();

-- Fix handle_task_activity function - it was returning NEW on DELETE which is NULL
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
  -- Return the appropriate record based on operation type
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Remove DELETE from task_activity_trigger to avoid FK constraint issues on activities table
DROP TRIGGER IF EXISTS "task_activity_trigger" ON "public"."tasks";

CREATE TRIGGER "task_activity_trigger" 
  AFTER INSERT OR UPDATE ON "public"."tasks" 
  FOR EACH ROW 
  EXECUTE FUNCTION "public"."handle_task_activity"();
