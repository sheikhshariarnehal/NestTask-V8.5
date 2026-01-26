-- Add performance indexes for task management page
-- These indexes will significantly improve query performance

-- Index for section_id queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_tasks_section_id ON tasks(section_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Index for category queries  
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);

-- Index for priority queries
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Index for due_date queries (used for sorting and filtering)
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Index for created_at queries (used for sorting)
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_tasks_section_status_created 
ON tasks(section_id, status, created_at DESC);

-- Index for search queries on name and description
CREATE INDEX IF NOT EXISTS idx_tasks_name_gin ON tasks USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tasks_description_gin ON tasks USING gin(description gin_trgm_ops);

-- Enable pg_trgm extension for text search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for assigned_to queries
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- Index for is_admin_task queries
CREATE INDEX IF NOT EXISTS idx_tasks_is_admin_task ON tasks(is_admin_task);

-- Analyze the table to update statistics
ANALYZE tasks;