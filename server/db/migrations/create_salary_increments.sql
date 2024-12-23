-- Create salary increments table
CREATE TABLE IF NOT EXISTS salary_increments (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) REFERENCES employees(id),
    previous_salary DECIMAL(12,2) NOT NULL,
    new_salary DECIMAL(12,2) NOT NULL,
    effective_date DATE NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_salary_increments_employee 
    ON salary_increments(employee_id);

CREATE INDEX IF NOT EXISTS idx_salary_increments_date 
    ON salary_increments(effective_date);

-- Add some sample data
INSERT INTO salary_increments (employee_id, previous_salary, new_salary, effective_date, remarks)
VALUES 
('23HR1001', 75000.00, 80000.00, '2024-01-01', 'Annual increment'),
('23IT1002', 85000.00, 90000.00, '2024-01-01', 'Performance based increment'); 