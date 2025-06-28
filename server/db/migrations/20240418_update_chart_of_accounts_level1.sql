-- Drop existing table if it exists
DROP TABLE IF EXISTS chart_of_accounts_level1 CASCADE;

-- Create new table with updated schema
CREATE TABLE chart_of_accounts_level1 (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    balance_type VARCHAR(10) CHECK (balance_type IN ('DEBIT', 'CREDIT')),
    account_type VARCHAR(10) CHECK (account_type IN ('SUPPLIER', 'CUSTOMER', 'VENDOR', 'ACCOUNT', 'EXPENSE')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_chart_of_accounts_level1_name ON chart_of_accounts_level1(name); 