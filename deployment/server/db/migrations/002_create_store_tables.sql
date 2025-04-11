-- Ensure accounts table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'accounts') THEN
        RAISE EXCEPTION 'accounts table must exist before running this migration';
    END IF;
END $$;

-- Create store items table
CREATE TABLE IF NOT EXISTS store_items (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    current_stock DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create store entries table
CREATE TABLE IF NOT EXISTS store_entries (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('STORE_IN', 'STORE_OUT')),
    item_id INTEGER REFERENCES store_items(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    vendor_id INTEGER REFERENCES accounts(id),
    department VARCHAR(100),
    issued_to VARCHAR(100),
    vehicle_number VARCHAR(20),
    driver_name VARCHAR(100),
    date_time TIMESTAMP NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create pricing entries table
CREATE TABLE IF NOT EXISTS pricing_entries (
    id SERIAL PRIMARY KEY,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALE_RETURN', 'STORE_PURCHASE')),
    reference_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED')),
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    price_per_unit DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create gate_entries_pricing table
CREATE TABLE IF NOT EXISTS gate_entries_pricing (
    id SERIAL PRIMARY KEY,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('PURCHASE', 'SALE', 'PURCHASE_RETURN', 'SALE_RETURN')),
    grn_number VARCHAR(50) NOT NULL,
    account_id INTEGER REFERENCES accounts(id),
    item_id INTEGER REFERENCES store_items(id),
    quantity DECIMAL(10,2) NOT NULL,
    price_per_unit DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED')),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_store_entries_type ON store_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_store_entries_item ON store_entries(item_id);
CREATE INDEX IF NOT EXISTS idx_store_entries_date ON store_entries(date_time);
CREATE INDEX IF NOT EXISTS idx_store_entries_vendor ON store_entries(vendor_id);
CREATE INDEX IF NOT EXISTS idx_pricing_entries_type ON pricing_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_pricing_entries_status ON pricing_entries(status);
CREATE INDEX IF NOT EXISTS idx_pricing_entries_reference ON pricing_entries(reference_id);
CREATE INDEX IF NOT EXISTS idx_gate_entries_pricing_grn ON gate_entries_pricing(grn_number);
CREATE INDEX IF NOT EXISTS idx_gate_entries_pricing_status ON gate_entries_pricing(status);

-- Insert sample store items only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM store_items LIMIT 1) THEN
        INSERT INTO store_items (item_name, item_code, category, unit) VALUES
            ('Engine Oil', 'EO001', 'Lubricants', 'Liter'),
            ('Spare Tire', 'ST001', 'Vehicle Parts', 'Piece'),
            ('Hydraulic Oil', 'HO001', 'Lubricants', 'Liter'),
            ('Air Filter', 'AF001', 'Filters', 'Piece'),
            ('Brake Pad', 'BP001', 'Vehicle Parts', 'Set');
    END IF;
END $$; 