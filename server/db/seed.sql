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