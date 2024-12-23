-- Insert departments
INSERT INTO departments (name, code) VALUES
('Human Resources', 'HR'),
('Mechanical', 'ME'),
('Electrical', 'EE'),
('Civil', 'CE'),
('Accounts', 'AC');

-- Insert sample employees
INSERT INTO employees (id, first_name, last_name, department_id, designation, joining_date, salary, phone) VALUES
('23HR1001', 'John', 'Doe', 1, 'HR Manager', '2023-01-01', 75000.00, '1234567890'),
('23IT1002', 'Jane', 'Smith', 2, 'Senior Developer', '2023-02-01', 85000.00, '0987654321'); 

-- Create final settlements table
CREATE TABLE final_settlements (
  id SERIAL PRIMARY KEY,
  employee_id VARCHAR(10) REFERENCES employees(id),
  separation_type VARCHAR(20) NOT NULL,
  last_working_date DATE NOT NULL,
  due_salary DECIMAL(10,2) NOT NULL,
  loan_deductions DECIMAL(10,2) DEFAULT 0,
  advance_deductions DECIMAL(10,2) DEFAULT 0,
  net_settlement DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_separation_type CHECK (separation_type IN ('terminate', 'resign'))
);

-- Add new columns to employees table
ALTER TABLE employees 
ADD COLUMN termination_date DATE,
ADD COLUMN separation_type VARCHAR(20),
ADD CONSTRAINT valid_employee_separation_type 
  CHECK (separation_type IN ('terminate', 'resign')); 