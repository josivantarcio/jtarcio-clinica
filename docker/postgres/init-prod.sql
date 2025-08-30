-- PostgreSQL production initialization script
-- This script runs when the PostgreSQL container is first created in production

-- Create necessary extensions for production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Full text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- Better indexing
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";  -- Query monitoring

-- Set timezone for Brazil
SET timezone = 'America/Sao_Paulo';

-- Production specific settings
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET min_wal_size = '1GB';
ALTER SYSTEM SET max_wal_size = '4GB';

-- Enable logging for production monitoring
ALTER SYSTEM SET log_destination = 'stderr';
ALTER SYSTEM SET log_statement = 'mod';  -- Log all modifications
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log slow queries (>1s)

-- Create a function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create N8N schema in the main database to avoid conflicts
CREATE SCHEMA IF NOT EXISTS n8n_schema;

-- Grant permissions for N8N to use the separate schema
GRANT ALL PRIVILEGES ON SCHEMA n8n_schema TO clinic_user;

-- Apply configuration
SELECT pg_reload_conf();

-- Create indexes for common query patterns (will be supplemented by Prisma migrations)
-- These are performance optimizations for the EO Clínica system

-- Note: Actual table creation and primary indexes are handled by Prisma migrations
-- This file focuses on database-level optimizations and setup