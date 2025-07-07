-- Migration: Create unified account ID system
-- This migration creates a new sequence and updates all account tables to use unique IDs

-- Create a sequence for unified account IDs
CREATE SEQUENCE IF NOT EXISTS unified_account_id_seq START 1;

-- Add new columns to store unified IDs
ALTER TABLE chart_of_accounts_level1 ADD COLUMN IF NOT EXISTS unified_id INTEGER;
ALTER TABLE chart_of_accounts_level2 ADD COLUMN IF NOT EXISTS unified_id INTEGER;
ALTER TABLE chart_of_accounts_level3 ADD COLUMN IF NOT EXISTS unified_id INTEGER;

-- Update existing accounts with unified IDs
UPDATE chart_of_accounts_level1 
SET unified_id = nextval('unified_account_id_seq') 
WHERE unified_id IS NULL;

UPDATE chart_of_accounts_level2 
SET unified_id = nextval('unified_account_id_seq') 
WHERE unified_id IS NULL;

UPDATE chart_of_accounts_level3 
SET unified_id = nextval('unified_account_id_seq') 
WHERE unified_id IS NULL;

-- Make unified_id NOT NULL and add unique constraint
ALTER TABLE chart_of_accounts_level1 ALTER COLUMN unified_id SET NOT NULL;
ALTER TABLE chart_of_accounts_level2 ALTER COLUMN unified_id SET NOT NULL;
ALTER TABLE chart_of_accounts_level3 ALTER COLUMN unified_id SET NOT NULL;

-- Add unique constraints
ALTER TABLE chart_of_accounts_level1 ADD CONSTRAINT unique_level1_unified_id UNIQUE (unified_id);
ALTER TABLE chart_of_accounts_level2 ADD CONSTRAINT unique_level2_unified_id UNIQUE (unified_id);
ALTER TABLE chart_of_accounts_level3 ADD CONSTRAINT unique_level3_unified_id UNIQUE (unified_id);

-- Create a function to get next unified ID
CREATE OR REPLACE FUNCTION get_next_unified_account_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN nextval('unified_account_id_seq');
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically assign unified IDs for new accounts
CREATE OR REPLACE FUNCTION assign_unified_id_level1()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unified_id IS NULL THEN
        NEW.unified_id := get_next_unified_account_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assign_unified_id_level2()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unified_id IS NULL THEN
        NEW.unified_id := get_next_unified_account_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION assign_unified_id_level3()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unified_id IS NULL THEN
        NEW.unified_id := get_next_unified_account_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_assign_unified_id_level1 ON chart_of_accounts_level1;
CREATE TRIGGER trigger_assign_unified_id_level1
    BEFORE INSERT ON chart_of_accounts_level1
    FOR EACH ROW
    EXECUTE FUNCTION assign_unified_id_level1();

DROP TRIGGER IF EXISTS trigger_assign_unified_id_level2 ON chart_of_accounts_level2;
CREATE TRIGGER trigger_assign_unified_id_level2
    BEFORE INSERT ON chart_of_accounts_level2
    FOR EACH ROW
    EXECUTE FUNCTION assign_unified_id_level2();

DROP TRIGGER IF EXISTS trigger_assign_unified_id_level3 ON chart_of_accounts_level3;
CREATE TRIGGER trigger_assign_unified_id_level3
    BEFORE INSERT ON chart_of_accounts_level3
    FOR EACH ROW
    EXECUTE FUNCTION assign_unified_id_level3(); 