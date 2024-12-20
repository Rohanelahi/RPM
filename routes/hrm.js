const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all employees
router.get('/employees', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM employees 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new employee
router.post('/employees', async (req, res) => {
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

  try {
    const result = await pool.query(
      `INSERT INTO employees (id, first_name, last_name, department_id, designation, joining_date, salary, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, firstName, lastName, departmentId, designation, joiningDate, salary, phone]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    const result = await pool.query(
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
router.post('/loan-applications', async (req, res) => {
  const {
    employeeId,
    loanType,
    amount,
    installments,
    startMonth,
    endMonth,
    monthlyInstallment
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO loan_applications 
       (employee_id, loan_type, amount, installments, start_month, end_month, monthly_installment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [employeeId, loanType, amount, installments, startMonth, endMonth, monthlyInstallment]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance by date
router.get('/attendance/:date', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id,
        a.employee_id,
        e.first_name || ' ' || e.last_name as name,
        d.name as department,
        a.status,
        a.in_time,
        a.out_time,
        a.overtime,
        a.remarks
      FROM daily_attendance a
      JOIN employees e ON a.employee_id = e.id
      JOIN departments d ON e.department_id = d.id
      WHERE a.attendance_date = $1
      ORDER BY e.id
    `, [req.params.date]);
    
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save daily attendance (bulk)
router.post('/attendance', async (req, res) => {
  const { date, attendance } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete existing attendance for the date
    await client.query(
      'DELETE FROM daily_attendance WHERE attendance_date = $1',
      [date]
    );

    // Insert new attendance records
    for (let record of attendance) {
      await client.query(
        `INSERT INTO daily_attendance 
         (employee_id, attendance_date, status, in_time, out_time, overtime, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          record.id,
          date,
          record.status,
          record.inTime,
          record.outTime,
          record.overtime,
          record.remarks
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Attendance saved successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get all employees for attendance
router.get('/employees-for-attendance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.id,
        e.first_name || ' ' || e.last_name as name,
        d.name as department
      FROM employees e
      JOIN departments d ON e.department_id = d.id
      ORDER BY e.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 