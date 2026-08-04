-- =============================================================
-- URS-DMS PostgreSQL initialization
-- Runs ONCE on first container startup (mounted into /docker-entrypoint-initdb.d/)
-- =============================================================

-- The database 'urs_dms' and user 'urs_user' are created automatically by
-- the postgres image via POSTGRES_DB and POSTGRES_USER environment variables.
-- This script only adds extensions and verifies access.

-- Useful extensions for URS-DMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "citext";      -- Case-insensitive text (for emails)

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON DATABASE urs_dms TO urs_user;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'URS-DMS database initialized successfully';
END
$$;
