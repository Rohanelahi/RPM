-- Migration: Update transactions table to use unified account IDs
-- This migration adds unified_account_id to transactions and updates existing records

-- Add unified_account_id column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS unified_account_id INTEGER;

-- Update existing transactions to use unified IDs
-- For Level 1 accounts
UPDATE transactions 
SET unified_account_id = (
  SELECT unified_id 
  FROM chart_of_accounts_level1 
  WHERE chart_of_accounts_level1.id = transactions.account_id
)
WHERE unified_account_id IS NULL 
AND EXISTS (
  SELECT 1 FROM chart_of_accounts_level1 
  WHERE chart_of_accounts_level1.id = transactions.account_id
);

-- For Level 2 accounts
UPDATE transactions 
SET unified_account_id = (
  SELECT unified_id 
  FROM chart_of_accounts_level2 
  WHERE chart_of_accounts_level2.id = transactions.account_id
)
WHERE unified_account_id IS NULL 
AND EXISTS (
  SELECT 1 FROM chart_of_accounts_level2 
  WHERE chart_of_accounts_level2.id = transactions.account_id
);

-- For Level 3 accounts
UPDATE transactions 
SET unified_account_id = (
  SELECT unified_id 
  FROM chart_of_accounts_level3 
  WHERE chart_of_accounts_level3.id = transactions.account_id
)
WHERE unified_account_id IS NULL 
AND EXISTS (
  SELECT 1 FROM chart_of_accounts_level3 
  WHERE chart_of_accounts_level3.id = transactions.account_id
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_unified_account_id ON transactions(unified_account_id);

-- Add foreign key constraint to ensure data integrity
-- Note: We'll add this after ensuring all transactions have valid unified_account_id values
-- ALTER TABLE transactions ADD CONSTRAINT fk_transactions_unified_account_id 
--   FOREIGN KEY (unified_account_id) REFERENCES unified_accounts(id); 