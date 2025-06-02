-- Drop existing table if it exists
DROP TABLE IF EXISTS chart_of_accounts_level2 CASCADE;

-- Create new table with updated schema
CREATE TABLE chart_of_accounts_level2 (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    balance_type VARCHAR(10) CHECK (balance_type IN ('DEBIT', 'CREDIT')),
    account_type VARCHAR(10) CHECK (account_type IN ('SUPPLIER', 'CUSTOMER', 'VENDOR', 'ACCOUNT')),
    level1_id INTEGER REFERENCES chart_of_accounts_level1(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, level1_id)
);

-- Create index for faster lookups
CREATE INDEX idx_chart_of_accounts_level2_name ON chart_of_accounts_level2(name);
CREATE INDEX idx_chart_of_accounts_level2_level1 ON chart_of_accounts_level2(level1_id); 