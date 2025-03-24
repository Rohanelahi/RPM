const express = require('express');
const router = express.Router();
const { addMonths, format } = require('date-fns');
const pool = require('../db');

// Attach pool to request object
router.use((req, res, next) => {
  req.pool = pool;
  next();
});

// Get all departments
router.get('/departments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        code,
        created_at
      FROM departments 
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ error: err.message });
  }
});

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
      phone,
      emergencyContactName,
      emergencyContactPhone
    } = req.body;

    console.log('Received employee data:', req.body);

    // Validate department exists
    const deptCheck = await client.query(
      'SELECT id FROM departments WHERE id = $1',
      [departmentId]
    );

    if (deptCheck.rows.length === 0) {
      throw new Error('Invalid department ID');
    }

    // Insert employee with emergency contact details
    const result = await client.query(
      `INSERT INTO employees 
       (id, first_name, last_name, department_id, designation, joining_date, 
        salary, phone, emergency_contact_name, emergency_contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        firstName,
        lastName,
        departmentId,
        designation,
        joiningDate,
        salary,
        phone,
        emergencyContactName,
        emergencyContactPhone
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

    console.log('Created employee:', employee.rows[0]);
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
  const client = await pool.connect();
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
      (employee_id, loan_type, amount, installments, start_month, end_month, monthly_installment, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'APPROVED')
      RETURNING id
    `, [employeeId, loanType, amount, installments, startMonth, endMonth, monthlyInstallment]);

    const loanId = result.rows[0].id;

    // Create installment records
    let currentDate = new Date(startMonth);
    for (let i = 0; i < installments; i++) {
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
      const isAdmin = record.department === 'Admin';
      const standardHours = isAdmin ? 8 : 12;

      await client.query(`
        INSERT INTO daily_attendance 
        (employee_id, attendance_date, status, in_time, out_time, overtime, remarks, hours_worked, standard_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        record.employee_id,
        date,
        record.status,
        record.in_time,
        record.out_time,
        record.overtime,
        record.remarks,
        record.hours_worked,
        standardHours
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

// Get attendance by date with employee details
router.get('/attendance/:date', async (req, res) => {
  try {
    const result = await req.pool.query(`
      SELECT 
        e.id as employee_id,
        e.first_name || ' ' || e.last_name as name,
        d.name as department,
        COALESCE(a.status, 'Present') as status,
        COALESCE(a.in_time, 
          CASE 
            WHEN d.name = 'Admin' THEN '09:00'::time
            ELSE '07:00'::time
          END
        ) as in_time,
        COALESCE(a.out_time, 
          CASE 
            WHEN d.name = 'Admin' THEN '17:00'::time
            ELSE '19:00'::time
          END
        ) as out_time,
        COALESCE(a.overtime, '0') as overtime,
        COALESCE(a.remarks, '') as remarks,
        e.salary as monthly_salary,
        d.name as department_name,
        COALESCE(a.hours_worked, 
          CASE 
            WHEN d.name = 'Admin' THEN 8
            ELSE 12
          END
        )::DECIMAL(5,2) as hours_worked,
        CASE 
          WHEN d.name = 'Admin' THEN 8
          ELSE 12
        END as standard_hours
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN daily_attendance a ON e.id = a.employee_id 
        AND a.attendance_date = $1
      WHERE e.status = 'ACTIVE'
      ORDER BY e.id
    `, [req.params.date]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get monthly attendance for employee
router.get('/attendance/:employeeId/:startDate/:endDate', async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.params;
    
    const result = await pool.query(`
      SELECT 
        attendance_date,
        status,
        in_time,
        out_time,
        overtime,
        remarks,
        hours_worked,
        standard_hours
      FROM daily_attendance
      WHERE employee_id = $1
      AND attendance_date BETWEEN $2 AND $3
      ORDER BY attendance_date
    `, [employeeId, startDate, endDate]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching monthly attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get employee loans and advances
router.get('/loans/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(`
      SELECT 
        l.*,
        TO_CHAR(l.start_month, 'YYYY-MM-DD') as start_month,
        TO_CHAR(l.end_month, 'YYYY-MM-DD') as end_month,
        (
          SELECT COUNT(*)
          FROM loan_installments li
          WHERE li.loan_application_id = l.id 
          AND li.paid = false
        ) as remaining_installments,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM loan_installments li
          WHERE li.loan_application_id = l.id 
          AND li.paid = false
        ) as remaining_amount,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM loan_installments li
          WHERE li.loan_application_id = l.id
        ) as total_amount
      FROM loan_applications l
      WHERE l.employee_id = $1
      AND l.status = 'APPROVED'
      AND EXISTS (
        SELECT 1 
        FROM loan_installments li 
        WHERE li.loan_application_id = l.id 
        AND li.paid = false
      )
      ORDER BY l.created_at DESC
    `, [employeeId]);

    // Instead of returning structured response, return flat array for consistency
    const formattedLoans = result.rows.map(loan => ({
      id: loan.id,
      employee_id: loan.employee_id,
      loan_type: loan.loan_type,
      amount: parseFloat(loan.amount),
      installments: parseInt(loan.installments),
      monthly_installment: parseFloat(loan.monthly_installment),
      remaining_amount: parseFloat(loan.remaining_amount),
      remaining_installments: parseInt(loan.remaining_installments),
      total_amount: parseFloat(loan.total_amount),
      status: loan.status,
      start_month: loan.start_month,
      end_month: loan.end_month
    }));

    console.log('API Response - Loans:', formattedLoans); // Debug log

    // Return flat array instead of structured object
    res.json(formattedLoans);

  } catch (err) {
    console.error('Error fetching employee loans:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get employee by ID
router.get('/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        e.*,
        d.name as department_name
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE e.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit final settlement
router.post('/settlements', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      employeeId,
      separationType,
      lastWorkingDate,
      dueSalary,
      loanDeductions,
      advanceDeductions,
      netSettlement
    } = req.body;

    // Insert settlement record
    const result = await client.query(`
      INSERT INTO final_settlements 
      (employee_id, separation_type, last_working_date, due_salary, 
       loan_deductions, advance_deductions, net_settlement)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      employeeId,
      separationType,
      lastWorkingDate,
      dueSalary,
      loanDeductions,
      advanceDeductions,
      netSettlement
    ]);

    // Update employee status to INACTIVE
    await client.query(`
      UPDATE employees 
      SET status = 'INACTIVE', 
          termination_date = $2,
          separation_type = $3
      WHERE id = $1
    `, [employeeId, lastWorkingDate, separationType]);

    // Clear remaining loan balances
    await client.query(`
      UPDATE loan_applications
      SET status = 'SETTLED'
      WHERE employee_id = $1 
      AND status = 'APPROVED'
    `, [employeeId]);

    await client.query('COMMIT');
    res.status(201).json({ 
      message: 'Final settlement processed successfully',
      settlementId: result.rows[0].id
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing final settlement:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update employee status
router.patch('/employees/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    await pool.query(`
      UPDATE employees 
      SET status = $2
      WHERE id = $1
    `, [id, status]);

    res.json({ message: 'Employee status updated successfully' });
  } catch (err) {
    console.error('Error updating employee status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add salary increment history
router.post('/salary-increments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      employeeId,
      previousSalary,
      newSalary,
      effectiveDate,
      remarks
    } = req.body;

    // Insert into salary increment history
    await client.query(`
      INSERT INTO salary_increments 
      (employee_id, previous_salary, new_salary, effective_date, remarks)
      VALUES ($1, $2, $3, $4, $5)
    `, [employeeId, previousSalary, newSalary, effectiveDate, remarks]);

    // Update employee salary
    await client.query(`
      UPDATE employees 
      SET salary = $2
      WHERE id = $1
    `, [employeeId, newSalary]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Salary increment processed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing salary increment:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Add new endpoint for salary payments
router.post('/salary-payments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { month, year, payments } = req.body;

    // Filter out inactive employees from payments
    const activePayments = payments.filter(payment => 
      payment.status === 'ACTIVE'
    );

    // Calculate total salary for the month (only active employees)
    const totalMonthSalary = activePayments.reduce((sum, payment) => 
      sum + payment.netSalary, 0
    );

    // Insert monthly total
    await client.query(`
      INSERT INTO monthly_salary_totals 
      (month, year, total_amount, payment_date, payment_status)
      VALUES ($1, $2, $3, CURRENT_DATE, 'PAID')
      ON CONFLICT (month, year) 
      DO UPDATE SET 
        total_amount = $3,
        payment_date = CURRENT_DATE,
        payment_status = 'PAID'
    `, [month, year, totalMonthSalary]);

    // Process individual payments
    for (const payment of activePayments) {
      await client.query(`
        INSERT INTO salary_payments 
        (employee_id, payment_month, payment_year, basic_salary, overtime_amount, 
         deductions, net_amount, payment_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, 'PAID')
      `, [
        payment.id,
        month,
        year,
        payment.basicSalary,
        payment.overtime,
        payment.deductions,
        payment.netSalary,
        payment.status
      ]);

      // Update due salary in employees table
      await client.query(`
        UPDATE employees 
        SET due_salary = COALESCE(due_salary, 0) + $2
        WHERE id = $1 AND NOT EXISTS (
          SELECT 1 FROM salary_payments 
          WHERE employee_id = $1 
          AND payment_month = $3 
          AND payment_year = $4
        )
      `, [payment.id, payment.netSalary, month, year]);
    }

    await client.query('COMMIT');
    res.status(201).json({ 
      message: 'Salary payments processed successfully',
      totalPaid: totalMonthSalary
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing salary payments:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update the status check endpoint to include monthly totals
router.get('/salary-payment-status/:month/:year', async (req, res) => {
  try {
    const { month, year } = req.params;
    const [payments, monthlyTotal] = await Promise.all([
      pool.query(`
        SELECT employee_id, status, payment_date 
        FROM salary_payments 
        WHERE payment_month = $1 AND payment_year = $2
      `, [month, year]),
      pool.query(`
        SELECT total_amount, payment_date, payment_status
        FROM monthly_salary_totals
        WHERE month = $1 AND year = $2
      `, [month, year])
    ]);

    res.json({
      payments: payments.rows,
      monthlyTotal: monthlyTotal.rows[0] || null
    });
  } catch (err) {
    console.error('Error fetching salary payment status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all contractors with correct salary for the specified month
router.get('/contractors', async (req, res) => {
  try {
    const { month, year } = req.query;
    const result = await pool.query(`
      WITH RankedSalaries AS (
        SELECT 
          c.*,
          csh.new_salary,
          csh.effective_month,
          csh.effective_year,
          ROW_NUMBER() OVER (
            PARTITION BY c.id 
            ORDER BY 
              csh.effective_year DESC,
              csh.effective_month DESC
          ) as rn
        FROM contractors c
        LEFT JOIN contractor_salary_history csh ON c.id = csh.contractor_id
        WHERE c.status = 'ACTIVE'
        AND (
          csh.effective_year IS NULL 
          OR (
            (csh.effective_year < $2)
            OR (csh.effective_year = $2 AND csh.effective_month <= $1)
          )
        )
      )
      SELECT 
        c.id,
        c.name,
        COALESCE(
          (
            SELECT rs.new_salary 
            FROM RankedSalaries rs 
            WHERE rs.id = c.id AND rs.rn = 1
          ),
          c.monthly_salary
        ) as monthly_salary,
        c.status,
        c.created_at
      FROM contractors c
      WHERE c.status = 'ACTIVE'
      ORDER BY c.name
    `, [month, year]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching contractors:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update contractor salary with history
router.post('/contractors/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { monthly_salary, effective_month, effective_year } = req.body;

    // Get current salary before update
    const currentSalary = await client.query(
      'SELECT monthly_salary FROM contractors WHERE id = $1',
      [id]
    );

    // Ensure monthly_salary is parsed as a decimal
    const newSalary = parseFloat(monthly_salary);

    // Insert into salary history
    await client.query(`
      INSERT INTO contractor_salary_history 
      (contractor_id, previous_salary, new_salary, effective_month, effective_year)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      id, 
      currentSalary.rows[0].monthly_salary,
      newSalary,
      effective_month,
      effective_year
    ]);

    // Update contractor's current salary
    const result = await client.query(`
      UPDATE contractors 
      SET monthly_salary = $2
      WHERE id = $1
      RETURNING *
    `, [id, newSalary]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating contractor:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Add new contractor
router.post('/contractors', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, monthly_salary } = req.body;

    const result = await client.query(`
      INSERT INTO contractors (name, monthly_salary)
      VALUES ($1, $2)
      RETURNING *
    `, [name, monthly_salary]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding contractor:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Pay contractors
router.post('/contractor-payments', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { month, year, payments } = req.body;

    for (const payment of payments) {
      await client.query(`
        INSERT INTO contractor_payments 
        (contractor_id, payment_month, payment_year, amount)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (contractor_id, payment_month, payment_year) 
        DO UPDATE SET 
          amount = EXCLUDED.amount,
          payment_date = CURRENT_TIMESTAMP
      `, [payment.id, month, year, payment.amount]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Contractor payments processed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error processing contractor payments:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update endpoint name and table name to reflect it stores total labor cost
router.post('/workers-salary-totals', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { month, year, totalAmount } = req.body;

    // Insert or update monthly total (now includes both workers and contractors)
    const result = await client.query(`
      INSERT INTO workers_salary_totals 
      (month, year, total_amount, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (month, year) 
      DO UPDATE SET 
        total_amount = $3,
        created_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [month, year, totalAmount]);

    await client.query('COMMIT');
    res.json({ 
      message: 'Total labor cost saved successfully',
      data: result.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving total labor cost:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update the employee deletion route to handle all related tables including salary_payments
router.delete('/employees/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // Delete related records in the correct order to avoid foreign key constraints
    // 1. Delete attendance records
    await client.query('DELETE FROM daily_attendance WHERE employee_id = $1', [id]);

    // 2. Delete loan installments and loan applications
    await client.query('DELETE FROM loan_installments WHERE loan_application_id IN (SELECT id FROM loan_applications WHERE employee_id = $1)', [id]);
    await client.query('DELETE FROM loan_applications WHERE employee_id = $1', [id]);

    // 3. Delete leave applications
    await client.query('DELETE FROM leave_applications WHERE employee_id = $1', [id]);

    // 4. Delete salary payments
    await client.query('DELETE FROM salary_payments WHERE employee_id = $1', [id]);

    // 5. Delete final settlements
    await client.query('DELETE FROM final_settlements WHERE employee_id = $1', [id]);

    // 6. Delete salary increments if they exist
    await client.query('DELETE FROM salary_increments WHERE employee_id = $1', [id]);

    // 7. Finally delete the employee
    const result = await client.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      throw new Error('Employee not found');
    }

    await client.query('COMMIT');
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting employee:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Add route to verify password
router.post('/verify-password', async (req, res) => {
  try {
    const { password } = req.body;
    // Replace this with your actual password verification logic
    const correctPassword = '1234'; // Store this securely!
    
    if (password === correctPassword) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error('Error verifying password:', err);
    res.status(500).json({ error: err.message });
  }
});

// First, let's modify the table structure
router.post('/init', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add hours_worked and standard_hours columns to daily_attendance
    await client.query(`
      ALTER TABLE daily_attendance 
      ADD COLUMN IF NOT EXISTS hours_worked DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS standard_hours INTEGER DEFAULT 8
    `);

    await client.query('COMMIT');
    res.json({ message: 'Database schema updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating schema:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router; 