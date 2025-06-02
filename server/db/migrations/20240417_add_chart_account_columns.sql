-- Add chart_account_id and chart_account_level columns to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS chart_account_id INTEGER REFERENCES chart_of_accounts_level1(id),
ADD COLUMN IF NOT EXISTS chart_account_level INTEGER DEFAULT 1; 