-- Migration: Add indexes for optimized task queries
-- Created: 2026-01-02
-- Purpose: Improve performance for date-based task filtering on /upcoming page

-- Add index on due_date for faster date range queries
-- This speeds up queries like: WHERE due_date >= '2026-01-01' AND due_date <= '2026-01-07'
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Add composite index on user_id and due_date for user-specific date queries
-- This optimizes queries that filter by both user and date range
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date);

-- Add index on section_id and due_date for section-based queries
-- Useful for admin tasks that are filtered by section
CREATE INDEX IF NOT EXISTS idx_tasks_section_due_date ON tasks(section_id, due_date) WHERE section_id IS NOT NULL;

-- Add index on is_admin_task for faster filtering of admin vs user tasks
CREATE INDEX IF NOT EXISTS idx_tasks_admin_flag ON tasks(is_admin_task) WHERE is_admin_task = true;

-- Analyze the tasks table to update query planner statistics
ANALYZE tasks;
