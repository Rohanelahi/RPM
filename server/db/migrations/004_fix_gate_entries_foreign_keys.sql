-- Drop existing foreign key constraints
ALTER TABLE gate_entries DROP CONSTRAINT IF EXISTS gate_entries_supplier_id_fkey;
ALTER TABLE gate_entries DROP CONSTRAINT IF EXISTS gate_entries_purchaser_id_fkey;

-- Create a function to check if an ID exists in any chart of accounts level
CREATE OR REPLACE FUNCTION check_chart_account_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- For supplier_id (used in purchase entries)
    IF NEW.supplier_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts_level1 WHERE id = NEW.supplier_id AND account_type = 'SUPPLIER'
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level2 WHERE id = NEW.supplier_id AND account_type = 'SUPPLIER'
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level3 WHERE id = NEW.supplier_id AND account_type = 'SUPPLIER'
    ) THEN
        RAISE EXCEPTION 'Supplier ID % does not exist in chart of accounts or is not a supplier', NEW.supplier_id;
    END IF;

    -- For purchaser_id (used in sale entries)
    IF NEW.purchaser_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts_level1 WHERE id = NEW.purchaser_id AND account_type = 'CUSTOMER'
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level2 WHERE id = NEW.purchaser_id AND account_type = 'CUSTOMER'
        UNION ALL
        SELECT 1 FROM chart_of_accounts_level3 WHERE id = NEW.purchaser_id AND account_type = 'CUSTOMER'
    ) THEN
        RAISE EXCEPTION 'Customer ID % does not exist in chart of accounts or is not a customer', NEW.purchaser_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check chart account existence
DROP TRIGGER IF EXISTS check_chart_account_trigger ON gate_entries;
CREATE TRIGGER check_chart_account_trigger
    BEFORE INSERT OR UPDATE ON gate_entries
    FOR EACH ROW
    EXECUTE FUNCTION check_chart_account_exists(); 