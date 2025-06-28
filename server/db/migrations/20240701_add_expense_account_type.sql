-- Migration: Add 'EXPENSE' to account_type constraints

-- Update accounts table constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check CHECK (account_type IN ('SUPPLIER', 'CUSTOMER', 'VENDOR', 'EXPENSE'));

-- Update chart_of_accounts_level1 constraint
ALTER TABLE chart_of_accounts_level1 DROP CONSTRAINT IF EXISTS chart_of_accounts_level1_account_type_check;
ALTER TABLE chart_of_accounts_level1 ADD CONSTRAINT chart_of_accounts_level1_account_type_check CHECK (account_type IN ('SUPPLIER', 'CUSTOMER', 'VENDOR', 'ACCOUNT', 'EXPENSE'));

-- Update chart_of_accounts_level2 constraint
ALTER TABLE chart_of_accounts_level2 DROP CONSTRAINT IF EXISTS chart_of_accounts_level2_account_type_check;
ALTER TABLE chart_of_accounts_level2 ADD CONSTRAINT chart_of_accounts_level2_account_type_check CHECK (account_type IN ('SUPPLIER', 'CUSTOMER', 'VENDOR', 'ACCOUNT', 'EXPENSE'));

-- Update chart_of_accounts_level3 constraint
ALTER TABLE chart_of_accounts_level3 DROP CONSTRAINT IF EXISTS chart_of_accounts_level3_account_type_check;
ALTER TABLE chart_of_accounts_level3 ADD CONSTRAINT chart_of_accounts_level3_account_type_check CHECK (account_type IN ('SUPPLIER', 'CUSTOMER', 'VENDOR', 'ACCOUNT', 'EXPENSE')); 