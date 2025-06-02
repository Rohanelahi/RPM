-- Create chart_of_accounts_level3 table
CREATE TABLE IF NOT EXISTS chart_of_accounts_level3 (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  balance_type VARCHAR(10) CHECK (balance_type IN ('DEBIT', 'CREDIT')),
  level1_id INTEGER REFERENCES chart_of_accounts_level1(id),
  level2_id INTEGER REFERENCES chart_of_accounts_level2(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, level2_id)
); 