-- Drop existing foreign key constraint
ALTER TABLE gate_entries_pricing DROP CONSTRAINT IF EXISTS gate_entries_pricing_account_id_fkey;

-- Create a function to check if an ID exists in any chart of accounts level
CREATE OR REPLACE FUNCTION check_chart_account_exists_pricing()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM chart_of_accounts_level1 WHERE id = NEW.account_id
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level2 WHERE id = NEW.account_id
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level3 WHERE id = NEW.account_id
    ) THEN
        RAISE EXCEPTION 'Account ID % does not exist in chart of accounts', NEW.account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check chart account existence
DROP TRIGGER IF EXISTS check_chart_account_trigger_pricing ON gate_entries_pricing;
CREATE TRIGGER check_chart_account_trigger_pricing
    BEFORE INSERT OR UPDATE ON gate_entries_pricing
    FOR EACH ROW
    EXECUTE FUNCTION check_chart_account_exists_pricing(); 