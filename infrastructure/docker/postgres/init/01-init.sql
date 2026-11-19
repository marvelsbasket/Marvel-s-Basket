-- ==============================================================================
-- MARVEL'S BASKET — POSTGRESQL INITIALIZATION SCRIPT
-- ==============================================================================
-- Automatically executed on initial container creation when volume is empty.
-- ==============================================================================

-- Enable standard UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant comprehensive schema permissions for development user
GRANT ALL ON SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO CURRENT_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO CURRENT_USER;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Marvel''s Basket database initialization completed successfully.';
END $$;
