const express = require('express');
const router = express.Router();
const { addMonths, format } = require('date-fns');
const pool = require('../db');

// Get all employees with department info
router.get('/employees', async (req, res) => {
  try {
    const result = await req.pool.query(`
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.department_id,
        d.name as department_name,
        e.designation,
        e.joining_date,
        e.status
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.status = 'ACTIVE'
      ORDER BY e.id
    `);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new employee
router.post('/employees', async (req, res) => {
  const client = await req.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      id,
      firstName,
      lastName,
      departmentId,
      designation,
      joiningDate,
      salary,
      phone
    } = req.body;

    console.log('Received employee data:', req.body); // Debug log

    // Validate department exists
    const deptCheck = await client.query(
      'SELECT id FROM departments WHERE id = $1',
      [departmentId]
    );

    if (deptCheck.rows.length === 0) {
      throw new Error('Invalid department ID');
    }

    // Insert employee
    const result = await client.query(
      `INSERT INTO employees 
       (id, first_name, last_name, department_id, designation, joining_date, salary, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        firstName,
        lastName,
        departmentId,
        designation,
        joiningDate,
        salary,
        phone
      ]
    );

    await client.query('COMMIT');

    // Return the created employee with department info
    const employee = await client.query(`
      SELECT 
        e.*,
        d.name as department_name
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1
    `, [id]);

    console.log('Created employee:', employee.rows[0]); // Debug log
    res.status(201).json(employee.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating employee:', err);
    res.status(500).json({ 
      error: err.message,
      details: 'Error creating employee in database'
    });
  } finally {
    client.release();
  }
});

// Submit leave application
router.post('/leave-applications', async (req, res) => {
  const {
    employeeId,
    startDate,
    endDate,
    reason,
    leaveWithPay
  } = req.body;

  try {
    const result = await req.pool.query(
      `INSERT INTO leave_applications (employee_id, start_date, end_date, reason, leave_with_pay)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [employeeId, startDate, endDate, reason, leaveWithPay]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit loan application
router.post('/loans', async (req, res) => {
  const client = await req.pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      employeeId,
      loanType,
      amount,
      installments,
      startMonth,
      endMonth,
      monthlyInstallment
    } = req.body;

    // Insert loan application
    const result = await client.query(`
      INSERT INTO loan_applications 
      (employee_id, loan_type, amount, installments, start_month, end_month, monthly_installment)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [employeeId, loanType, amount, installments, startMonth, endMonth, monthlyInstallment]);

    const loanId = result.rows[0].id;

    // Create installment records
    let currentDate = new Date(startMonth);
    for (let i = 0; i < parseInt(installments); i++) {
      await client.query(`
        INSERT INTO loan_installments 
        (loan_application_id, installment_date, amount)
        VALUES ($1, $2, $3)
      `, [loanId, format(currentDate, 'yyyy-MM-dd'), monthlyInstallment]);
      
      currentDate = addMonths(currentDate, 1);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Loan application submitted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error submitting loan application:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Submit leave application
router.post('/leaves', async (req, res) => {
  try {
    const {
      employeeId,
      startDate,
      endDate,
      reason,
      leaveWithPay
    } = req.body;

    await req.pool.query(`
      INSERT INTO leave_applications 
      (employee_id, start_date, end_date, reason, leave_with_pay)
      VALUES ($1, $2, $3, $4, $5)
    `, [employeeId, startDate, endDate, reason, leaveWithPay]);

    res.status(201).json({ message: 'Leave application submitted successfully' });
  } catch (err) {
    console.error('Error submitting leave application:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get attendance by date with employee details
router.get('/attendance/:date', async (req, res) => {
  try {
    const result = await req.pool.query(`
      SELECT 
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as name,
        d.name as department,
        COALESCE(a.status, 'Present') as status,
        COALESCE(a.in_time, '09:00') as in_time,
        COALESCE(a.out_time, '17:00') as out_time,
        COALESCE(a.overtime, '0') as overtime,
        COALESCE(a.remarks, '') as remarks
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN daily_attendance a ON e.id = a.employee_id 
        AND a.attendance_date = $1
      WHERE e.status = 'ACTIVE'
      ORDER BY e.id
    `, [req.params.date]);
    
    console.log('Fetched attendance:', result.rows); // Debug log
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Save attendance
router.post('/attendance', async (req, res) => {
  const client = await req.pool.connect();
  try {
    await client.query('BEGIN');
    const { date, attendance } = req.body;

    // Delete existing attendance records for the date
    await client.query('DELETE FROM daily_attendance WHERE attendance_date = $1', [date]);

    // Insert new attendance records
    for (const record of attendance) {
      await client.query(`
        INSERT INTO daily_attendance 
        (employee_id, attendance_date, status, in_time, out_time, overtime, remarks)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        record.employee_id,
        date,
        record.status,
        record.in_time,
        record.out_time,
        record.overtime,
        record.remarks
      ]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Attendance saved successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving attendance:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get all departments
router.get('/departments', async (req, res) => {
  try {
    const result = await req.pool.query('SELECT * FROM departments ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get monthly attendance for employee
router.get('/attendance/:employeeId/:startDate/:endDate', async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM daily_attendance
      WHERE employee_id = $1
      AND attendance_date BETWEEN $2 AND $3
    `, [employeeId, startDate, endDate]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching monthly attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get employee loans
router.get('/loans/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM loan_applications
      WHERE employee_id = $1
      AND status = 'APPROVED'
      AND end_month >= CURRENT_DATE
    `, [employeeId]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching employee loans:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 