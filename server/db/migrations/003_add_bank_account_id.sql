-- Add bank_account_id column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bank_account_id INTEGER REFERENCES bank_accounts(id);

-- Add bank_account_id column to bank_transactions table if it doesn't exist
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS bank_account_id INTEGER REFERENCES bank_accounts(id);

-- Update existing bank_transactions records to set bank_account_id
UPDATE bank_transactions 
SET bank_account_id = account_id 
WHERE bank_account_id IS NULL;

-- Add bank_account_id column to cash_transactions table if it doesn't exist
ALTER TABLE cash_transactions ADD COLUMN IF NOT EXISTS bank_account_id INTEGER REFERENCES bank_accounts(id); 