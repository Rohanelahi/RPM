-- Drop the existing foreign key constraints
ALTER TABLE gate_entries 
DROP CONSTRAINT IF EXISTS gate_entries_purchaser_id_fkey,
DROP CONSTRAINT IF EXISTS gate_entries_supplier_id_fkey;

-- Add the correct foreign key constraints referencing accounts table
ALTER TABLE gate_entries
ADD CONSTRAINT gate_entries_purchaser_id_fkey
    FOREIGN KEY (purchaser_id)
    REFERENCES accounts(id),
ADD CONSTRAINT gate_entries_supplier_id_fkey
    FOREIGN KEY (supplier_id)
    REFERENCES accounts(id); 