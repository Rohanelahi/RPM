-- Drop tables in reverse order (due to foreign key dependencies)
DROP TABLE IF EXISTS loan_installments;
DROP TABLE IF EXISTS loan_applications;
DROP TABLE IF EXISTS leave_applications;
DROP TABLE IF EXISTS daily_attendance;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;

-- Create Departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clear existing departments data
TRUNCATE departments RESTART IDENTITY CASCADE;

-- Insert all departments
INSERT INTO departments (name, code) VALUES
    ('Human Resources', 'HR'),
    ('Information Technology', 'IT'),
    ('Production', 'PR'),
    ('Sales', 'SL'),
    ('Accounts', 'AC'),
    ('Mechanical', 'ME'),
    ('Electrical', 'EL'),
    ('Pulp', 'PL'),
    ('Machine Hall', 'MH'),
    ('Admin', 'AD');

-- Create other tables
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    designation VARCHAR(100) NOT NULL,
    joining_date DATE NOT NULL,
    salary DECIMAL(12,2) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_attendance (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) REFERENCES employees(id),
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Half Day', 'On Leave', 'Holiday', 'Weekend')),
    in_time TIME,
    out_time TIME,
    overtime DECIMAL(4,2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS leave_applications (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) REFERENCES employees(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    leave_with_pay BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_applications (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) REFERENCES employees(id),
    loan_type VARCHAR(20) NOT NULL CHECK (loan_type IN ('loan', 'advance')),
    amount DECIMAL(12,2) NOT NULL,
    installments INTEGER NOT NULL,
    start_month DATE NOT NULL,
    end_month DATE NOT NULL,
    monthly_installment DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_installments (
    id SERIAL PRIMARY KEY,
    loan_application_id INTEGER REFERENCES loan_applications(id),
    installment_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    paid BOOLEAN DEFAULT false,
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add view for employee details with department name
CREATE OR REPLACE VIEW employee_details AS
SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.department_id,
    d.name as department_name,
    e.designation,
    e.joining_date,
    e.salary,
    e.phone,
    e.status,
    e.created_at
FROM 
    employees e
    LEFT JOIN departments d ON e.department_id = d.id;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_attendance_employee_date 
    ON daily_attendance(employee_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_loan_applications_employee_status 
    ON loan_applications(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_employees_department 
    ON employees(department_id);

CREATE INDEX IF NOT EXISTS idx_employees_status 
    ON employees(status);