-- Database Hardening: Move pg_net extension to secure schema
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension from public to extensions schema
ALTER EXTENSION "pg_net" SET SCHEMA extensions;