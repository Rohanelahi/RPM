-- Create monthly_price_averages table
CREATE TABLE IF NOT EXISTS monthly_price_averages (
    id SERIAL PRIMARY KEY,
    item_type VARCHAR(100) NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    average_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_type, month, year)
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_price_averages_item_month_year 
    ON monthly_price_averages(item_type, month, year); 