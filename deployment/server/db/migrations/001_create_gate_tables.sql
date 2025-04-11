-- Create suppliers table first (no foreign key dependencies)
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchasers table (no foreign key dependencies)
CREATE TABLE IF NOT EXISTS purchasers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create gate entries table with foreign key references
CREATE TABLE IF NOT EXISTS gate_entries (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('PURCHASE_IN', 'SALE_OUT', 'PURCHASE_RETURN', 'SALE_RETURN')),
    supplier_id INTEGER REFERENCES suppliers(id),
    purchaser_id INTEGER REFERENCES purchasers(id),
    vehicle_type VARCHAR(20),
    vehicle_number VARCHAR(20) NOT NULL,
    driver_name VARCHAR(100),
    item_type VARCHAR(50),
    paper_type VARCHAR(50),
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    date_time TIMESTAMP NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create return entries table with foreign key reference to gate_entries
CREATE TABLE IF NOT EXISTS gate_returns (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(50) UNIQUE NOT NULL,
    original_grn_number VARCHAR(50) REFERENCES gate_entries(grn_number),
    return_type VARCHAR(20) NOT NULL CHECK (return_type IN ('PURCHASE_RETURN', 'SALE_RETURN')),
    return_quantity DECIMAL(10,2) NOT NULL,
    return_reason VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(20),
    vehicle_number VARCHAR(20) NOT NULL,
    driver_name VARCHAR(100),
    date_time TIMESTAMP NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gate_entries_type ON gate_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_gate_entries_supplier ON gate_entries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_gate_entries_purchaser ON gate_entries(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_gate_entries_date ON gate_entries(date_time);

CREATE INDEX IF NOT EXISTS idx_gate_returns_type ON gate_returns(return_type);
CREATE INDEX IF NOT EXISTS idx_gate_returns_original_grn ON gate_returns(original_grn_number);
CREATE INDEX IF NOT EXISTS idx_gate_returns_date ON gate_returns(date_time);

-- Add sample data only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM suppliers LIMIT 1) THEN
        INSERT INTO suppliers (name, contact, address) VALUES
            ('Supplier 1', '123-456-7890', '123 Supplier St'),
            ('Supplier 2', '098-765-4321', '456 Vendor Ave');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM purchasers LIMIT 1) THEN
        INSERT INTO purchasers (name, contact, address) VALUES
            ('Purchaser 1', '111-222-3333', '789 Buyer St'),
            ('Purchaser 2', '444-555-6666', '321 Customer Ave');
    END IF;
END $$; 