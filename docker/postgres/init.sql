-- PostgreSQL initialization script
-- This script runs when the PostgreSQL container is first created

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for better performance (these will be created by Prisma migrations)
-- This file is mainly for any custom database setup

-- Set timezone
SET timezone = 'America/Sao_Paulo';

-- Create a function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- This file can be extended with additional database setup as needed