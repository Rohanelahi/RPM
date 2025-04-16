const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Add new production record
router.post('/add', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      date,
      paperType,
      totalWeight,
      boilerFuelType,
      boilerFuelQuantity,
      boilerFuelCost,
      electricityUnits,
      electricityUnitPrice,
      electricityCost,
      recipe,
      totalYield
    } = req.body;

    // Validate numeric fields with proper limits
    const validatedTotalWeight = totalWeight === '' ? 0 : 
      Math.min(parseFloat(totalWeight), 9999999.99); // Limit to fit within NUMERIC(10,2)

    const validatedBoilerFuelQuantity = boilerFuelQuantity === '' ? 0 : 
      Math.min(parseFloat(boilerFuelQuantity), 9999999.99);

    const validatedBoilerFuelCost = boilerFuelCost === '' ? 0 : 
      Math.min(parseFloat(boilerFuelCost), 9999999.99);

    const validatedElectricityUnits = electricityUnits === '' ? 0 : 
      Math.min(parseFloat(electricityUnits), 9999999.99);

    const validatedElectricityUnitPrice = electricityUnitPrice === '' ? 0 : 
      Math.min(parseFloat(electricityUnitPrice), 9999999.99);

    const validatedElectricityCost = electricityCost === '' ? 0 : 
      Math.min(parseFloat(electricityCost), 9999999.99);

    const validatedTotalYield = totalYield === '' ? 0 : 
      Math.min(parseFloat(totalYield), 100); // Yield should be a percentage

    // Validate recipe calculations
    const validatedRecipe = recipe.map(item => {
      const percentageUsed = parseFloat(item.percentageUsed) || 0;
      const yieldPercentage = parseFloat(item.yield) || 0;
      
      // New formula: (totalWeight + (totalWeight - totalWeight * (yield/100))) * (percentage/100)
      const wastage = validatedTotalWeight - (validatedTotalWeight * (yieldPercentage / 100));
      const totalRequired = validatedTotalWeight + wastage;
      const calculatedQuantity = totalRequired * (percentageUsed / 100);
      
      return {
        ...item,
        quantity_used: calculatedQuantity.toFixed(2),
        yield_percentage: yieldPercentage
      };
    });

    // Insert main production record with electricity fields
    const productionResult = await client.query(
      `INSERT INTO production (
        date_time,
        paper_type,
        total_weight,
        total_reels,
        boiler_fuel_type,
        boiler_fuel_quantity,
        boiler_fuel_cost,
        electricity_units,
        electricity_unit_price,
        electricity_cost,
        total_yield_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        new Date(date),
        paperType,
        validatedTotalWeight,
        0, // Set total_reels to 0 since we're not using reels anymore
        boilerFuelType || null,
        validatedBoilerFuelQuantity,
        validatedBoilerFuelCost,
        validatedElectricityUnits,
        validatedElectricityUnitPrice,
        validatedElectricityCost,
        validatedTotalYield
      ]
    );

    const productionId = productionResult.rows[0].id;

    // Insert recipe items with validation and calculated quantity
    for (const item of validatedRecipe) {
      await client.query(
        `INSERT INTO production_recipe (
          production_id,
          raddi_type,
          percentage_used,
          quantity_used,
          yield_percentage
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          productionId, 
          item.raddiType || '', 
          parseFloat(item.percentageUsed) || 0,
          parseFloat(item.quantity_used) || 0,
          parseFloat(item.yield_percentage) || 0
        ]
      );

      // Insert stock adjustment record
      await client.query(
        `INSERT INTO stock_adjustments (
          item_type,
          quantity,
          adjustment_type,
          reference_type,
          reference_id,
          date_time
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          item.raddiType,
          -parseFloat(item.quantity_used), // Negative quantity for reduction
          'PRODUCTION_USAGE',
          'PRODUCTION',
          productionId,
          new Date(date)
        ]
      );
    }

    // Add stock adjustment for boiler fuel
    if (boilerFuelType && validatedBoilerFuelQuantity > 0) {
      await client.query(
        `INSERT INTO stock_adjustments (
          item_type,
          quantity,
          adjustment_type,
          reference_type,
          reference_id,
          date_time
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          boilerFuelType,
          -validatedBoilerFuelQuantity, // Negative quantity for reduction
          'PRODUCTION_USAGE',
          'PRODUCTION',
          productionId,
          new Date(date)
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, id: productionId });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding production record:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Add a new endpoint to check stock availability
router.post('/check-stock', async (req, res) => {
  try {
    const { recipe } = req.body;
    const stockChecks = [];

    for (const item of recipe) {
      if (!item.raddiType || !item.quantityUsed) continue;

      // Updated query to combine both gate entries and stock adjustments
      const result = await pool.query(
        `SELECT 
          COALESCE(
            (
              SELECT SUM(
                CASE 
                  WHEN ge.entry_type = 'PURCHASE_IN' THEN COALESCE(gep.final_quantity, ge.quantity)
                  WHEN ge.entry_type = 'PURCHASE_RETURN' THEN -COALESCE(gep.final_quantity, ge.quantity)
                  WHEN ge.entry_type = 'SALE_OUT' THEN -ge.quantity
                  WHEN ge.entry_type = 'SALE_RETURN' THEN ge.quantity
                END
              )
              FROM gate_entries ge
              LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
              WHERE ge.item_type = $1
              AND ge.entry_type IN ('PURCHASE_IN', 'PURCHASE_RETURN', 'SALE_OUT', 'SALE_RETURN')
            ), 0
          ) + 
          COALESCE(
            (
              SELECT SUM(quantity)
              FROM stock_adjustments
              WHERE item_type = $1
            ), 0
          ) as available_quantity`,
        [item.raddiType]
      );

      const availableQuantity = parseFloat(result.rows[0].available_quantity) || 0;
      const requiredQuantity = parseFloat(item.quantityUsed);

      stockChecks.push({
        raddiType: item.raddiType,
        available: availableQuantity,
        required: requiredQuantity,
        sufficient: availableQuantity >= requiredQuantity
      });
    }

    res.json(stockChecks);
  } catch (error) {
    console.error('Error checking stock:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get production history
router.get('/history', async (req, res) => {
  try {
    const { paperType, startDate, endDate } = req.query;
    let conditions = [];
    let params = [];
    let paramCount = 1;

    let query = `
      WITH LatestPrices AS (
        SELECT DISTINCT ON (item_type) 
          item_type,
          price_per_unit as latest_price,
          date_time
        FROM (
          SELECT 
            ge.item_type,
            gep.price_per_unit,
            ge.date_time
          FROM gate_entries ge
          JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
          WHERE ge.entry_type = 'PURCHASE_IN'
          
          UNION ALL
          
          SELECT 
            t.item_name as item_type,
            t.price_per_unit,
            t.transaction_date as date_time
          FROM transactions t
          WHERE t.item_name IS NOT NULL 
          AND t.price_per_unit IS NOT NULL
        ) all_prices
        ORDER BY item_type, date_time DESC
      ),
      MaintenanceCosts AS (
        SELECT 
          DATE(mi.issue_date) as cost_date,
          SUM(mii.quantity * mii.unit_price) as maintenance_cost
        FROM maintenance_issues mi
        JOIN maintenance_issue_items mii ON mi.id = mii.issue_id
        GROUP BY DATE(mi.issue_date)
      ),
      DailyLabor AS (
        SELECT 
          a.attendance_date,
          COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_workers,
          SUM(e.salary / 30.0) as daily_salary_cost
        FROM daily_attendance a
        JOIN employees e ON a.employee_id = e.id
        GROUP BY a.attendance_date
      ),
      ContractorsCost AS (
        SELECT SUM(monthly_salary) / 31.0 as daily_contractors_cost
        FROM contractors
        WHERE status = 'ACTIVE'
      ),
      DailyExpenses AS (
        SELECT 
          DATE(e.date) as expense_date,
          SUM(e.amount) as daily_expense
        FROM expenses e
        GROUP BY DATE(e.date)
      )
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'raddi_type', pr.raddi_type,
            'percentage_used', pr.percentage_used,
            'quantity_used', pr.quantity_used,
            'yield_percentage', pr.yield_percentage,
            'unit_price', COALESCE(lp.latest_price, 0)
          )
        ) as recipe,
        COALESCE(mc.maintenance_cost, 0) as maintenance_cost,
        COALESCE(dl.daily_salary_cost, 0) as labor_cost,
        COALESCE(cc.daily_contractors_cost, 0) as contractors_cost,
        COALESCE(de.daily_expense, 0) as daily_expenses,
        (
          SELECT COALESCE(lp.latest_price, 0)
          FROM LatestPrices lp
          WHERE lp.item_type = p.boiler_fuel_type
        ) as boiler_fuel_price
      FROM production p
      LEFT JOIN production_recipe pr ON p.id = pr.production_id
      LEFT JOIN LatestPrices lp ON pr.raddi_type = lp.item_type
      LEFT JOIN MaintenanceCosts mc ON DATE(p.date_time) = mc.cost_date
      LEFT JOIN DailyLabor dl ON DATE(p.date_time) = dl.attendance_date
      LEFT JOIN DailyExpenses de ON DATE(p.date_time) = de.expense_date
      CROSS JOIN ContractorsCost cc`;

    if (paperType) {
      conditions.push(`p.paper_type = $${paramCount}`);
      params.push(paperType);
      paramCount++;
    }

    // Add date validation before adding to conditions
    if (startDate && startDate !== 'null' && startDate !== 'undefined') {
      try {
        const validStartDate = new Date(startDate);
        if (!isNaN(validStartDate.getTime())) {
          conditions.push(`p.date_time >= $${paramCount}`);
          params.push(validStartDate);
          paramCount++;
        }
      } catch (error) {
        console.warn('Invalid start date provided:', startDate);
      }
    }

    if (endDate && endDate !== 'null' && endDate !== 'undefined') {
      try {
        const validEndDate = new Date(endDate);
        if (!isNaN(validEndDate.getTime())) {
          conditions.push(`p.date_time <= $${paramCount}`);
          params.push(validEndDate);
          paramCount++;
        }
      } catch (error) {
        console.warn('Invalid end date provided:', endDate);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` GROUP BY p.id, mc.maintenance_cost, dl.daily_salary_cost, cc.daily_contractors_cost, de.daily_expense ORDER BY p.date_time DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching production history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint for today's production
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await pool.query(`
      WITH LatestPrices AS (
        SELECT DISTINCT ON (item_type) 
          item_type,
          price_per_unit as latest_price,
          date_time
        FROM (
          SELECT 
            ge.item_type,
            gep.price_per_unit,
            ge.date_time
          FROM gate_entries ge
          JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
          WHERE ge.entry_type = 'PURCHASE_IN'
          
          UNION ALL
          
          SELECT 
            t.item_name as item_type,
            t.price_per_unit,
            t.transaction_date as date_time
          FROM transactions t
          WHERE t.item_name IS NOT NULL 
          AND t.price_per_unit IS NOT NULL
        ) all_prices
        ORDER BY item_type, date_time DESC
      ),
      MaintenanceIssues AS (
        SELECT 
          DATE(mi.issue_date) as cost_date,
          SUM(mii.quantity * mii.unit_price) as maintenance_cost
        FROM maintenance_issues mi
        JOIN maintenance_issue_items mii ON mi.id = mii.issue_id
        GROUP BY DATE(mi.issue_date)
      ),
      DailyLabor AS (
        SELECT 
          a.attendance_date,
          COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_workers,
          SUM(e.salary / 30.0) as daily_salary_cost
        FROM daily_attendance a
        JOIN employees e ON a.employee_id = e.id
        GROUP BY a.attendance_date
      ),
      ContractorsCost AS (
        SELECT SUM(monthly_salary) / 31.0 as daily_contractors_cost
        FROM contractors
        WHERE status = 'ACTIVE'
      ),
      DailyExpenses AS (
        SELECT 
          DATE(e.date) as expense_date,
          SUM(e.amount) as daily_expense
        FROM expenses e
        WHERE DATE(e.date) = DATE($1)
        GROUP BY DATE(e.date)
      )
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'raddi_type', pr.raddi_type,
            'quantity_used', pr.quantity_used,
            'percentage_used', pr.percentage_used,
            'yield_percentage', pr.yield_percentage,
            'unit_price', COALESCE(lp.latest_price, 0)
          )
        ) as recipe,
        COALESCE(mi.maintenance_cost, 0) as maintenance_cost,
        COALESCE(dl.daily_salary_cost, 0) as labor_cost,
        COALESCE(cc.daily_contractors_cost, 0) as contractors_cost,
        COALESCE(de.daily_expense, 0) as daily_expenses,
        (
          SELECT COALESCE(lp.latest_price, 0)
          FROM LatestPrices lp
          WHERE lp.item_type = p.boiler_fuel_type
        ) as boiler_fuel_price
      FROM production p
      LEFT JOIN production_recipe pr ON p.id = pr.production_id
      LEFT JOIN LatestPrices lp ON pr.raddi_type = lp.item_type
      LEFT JOIN MaintenanceIssues mi ON DATE(p.date_time) = mi.cost_date
      LEFT JOIN DailyLabor dl ON DATE(p.date_time) = dl.attendance_date
      LEFT JOIN DailyExpenses de ON DATE(p.date_time) = de.expense_date
      CROSS JOIN ContractorsCost cc
      WHERE DATE(p.date_time) = DATE($1)
      GROUP BY p.id, mi.maintenance_cost, dl.daily_salary_cost, cc.daily_contractors_cost, de.daily_expense
      ORDER BY p.date_time DESC
      LIMIT 1
    `, [today]);

    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching today\'s production data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint for yesterday's production
router.get('/yesterday', async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const result = await pool.query(`
      WITH LatestPrices AS (
        SELECT DISTINCT ON (item_type) 
          item_type,
          price_per_unit as latest_price,
          date_time
        FROM (
          SELECT 
            ge.item_type,
            gep.price_per_unit,
            ge.date_time
          FROM gate_entries ge
          JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
          WHERE ge.entry_type = 'PURCHASE_IN'
          
          UNION ALL
          
          SELECT 
            t.item_name as item_type,
            t.price_per_unit,
            t.transaction_date as date_time
          FROM transactions t
          WHERE t.item_name IS NOT NULL 
          AND t.price_per_unit IS NOT NULL
        ) all_prices
        ORDER BY item_type, date_time DESC
      ),
      MaintenanceIssues AS (
        SELECT 
          DATE(mi.issue_date) as cost_date,
          SUM(mii.quantity * mii.unit_price) as maintenance_cost
        FROM maintenance_issues mi
        JOIN maintenance_issue_items mii ON mi.id = mii.issue_id
        GROUP BY DATE(mi.issue_date)
      ),
      DailyLabor AS (
        SELECT 
          a.attendance_date,
          COUNT(CASE WHEN a.status = 'Present' THEN 1 END) as present_workers,
          SUM(e.salary / 30.0) as daily_salary_cost
        FROM daily_attendance a
        JOIN employees e ON a.employee_id = e.id
        GROUP BY a.attendance_date
      ),
      ContractorsCost AS (
        SELECT SUM(monthly_salary) / 31.0 as daily_contractors_cost
        FROM contractors
        WHERE status = 'ACTIVE'
      ),
      DailyExpenses AS (
        SELECT 
          DATE(e.date) as expense_date,
          SUM(e.amount) as daily_expense
        FROM expenses e
        WHERE DATE(e.date) = DATE($1)
        GROUP BY DATE(e.date)
      )
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'raddi_type', pr.raddi_type,
            'quantity_used', pr.quantity_used,
            'percentage_used', pr.percentage_used,
            'yield_percentage', pr.yield_percentage,
            'unit_price', COALESCE(lp.latest_price, 0)
          )
        ) as recipe,
        COALESCE(mi.maintenance_cost, 0) as maintenance_cost,
        COALESCE(dl.daily_salary_cost, 0) as labor_cost,
        COALESCE(cc.daily_contractors_cost, 0) as contractors_cost,
        COALESCE(de.daily_expense, 0) as daily_expenses,
        (
          SELECT COALESCE(lp.latest_price, 0)
          FROM LatestPrices lp
          WHERE lp.item_type = p.boiler_fuel_type
        ) as boiler_fuel_price
      FROM production p
      LEFT JOIN production_recipe pr ON p.id = pr.production_id
      LEFT JOIN LatestPrices lp ON pr.raddi_type = lp.item_type
      LEFT JOIN MaintenanceIssues mi ON DATE(p.date_time) = mi.cost_date
      LEFT JOIN DailyLabor dl ON DATE(p.date_time) = dl.attendance_date
      LEFT JOIN DailyExpenses de ON DATE(p.date_time) = de.expense_date
      CROSS JOIN ContractorsCost cc
      WHERE DATE(p.date_time) = DATE($1)
      GROUP BY p.id, mi.maintenance_cost, dl.daily_salary_cost, cc.daily_contractors_cost, de.daily_expense
      ORDER BY p.date_time DESC
      LIMIT 1
    `, [yesterday]);

    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching yesterday\'s production data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint for monthly statistics
router.get('/monthly-stats', async (req, res) => {
  try {
    const { startDate } = req.query;
    const start = new Date(startDate);

    // Get electricity consumption
    const electricityResult = await pool.query(`
      SELECT COALESCE(SUM(electricity_units), 0) as total_units
      FROM production
      WHERE DATE(date_time) >= $1
    `, [start]);

    // Get raw materials usage
    const rawMaterialsResult = await pool.query(`
      SELECT 
        pr.raddi_type as type,
        SUM(pr.quantity_used) as quantity
      FROM production p
      JOIN production_recipe pr ON p.id = pr.production_id
      WHERE DATE(p.date_time) >= $1
      GROUP BY pr.raddi_type
      ORDER BY pr.raddi_type
    `, [start]);

    // Get boiler fuel usage
    const boilerFuelResult = await pool.query(`
      SELECT 
        boiler_fuel_type as type,
        SUM(boiler_fuel_quantity) as quantity
      FROM production
      WHERE DATE(date_time) >= $1
        AND boiler_fuel_type IS NOT NULL
      GROUP BY boiler_fuel_type
      ORDER BY boiler_fuel_type
    `, [start]);

    res.json({
      electricity: Number(electricityResult.rows[0]?.total_units || 0),
      rawMaterials: rawMaterialsResult.rows.map(row => ({
        type: row.type,
        quantity: Number(row.quantity)
      })),
      boilerFuel: boilerFuelResult.rows.map(row => ({
        type: row.type,
        quantity: Number(row.quantity)
      }))
    });

  } catch (error) {
    console.error('Error fetching monthly statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update the daily-stats endpoint to match ProductionHistory calculation
router.get('/daily-stats', async (req, res) => {
  try {
    const { startDate } = req.query;
    const start = new Date(startDate);

    const result = await pool.query(`
      WITH LatestPrices AS (
        SELECT DISTINCT ON (item_type) 
          item_type,
          price_per_unit as latest_price
        FROM (
          SELECT 
            ge.item_type,
            gep.price_per_unit,
            ge.date_time
          FROM gate_entries ge
          JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
          WHERE ge.entry_type = 'PURCHASE_IN'
          
          UNION ALL
          
          SELECT 
            t.item_name as item_type,
            t.price_per_unit,
            t.transaction_date as date_time
          FROM transactions t
          WHERE t.item_name IS NOT NULL 
          AND t.price_per_unit IS NOT NULL
        ) all_prices
        ORDER BY item_type, date_time DESC
      ),
      DailyExpenses AS (
        SELECT 
          DATE(e.date) as expense_date,
          SUM(e.amount) as daily_expense
        FROM expenses e
        WHERE DATE(e.date) >= $1
        GROUP BY DATE(e.date)
      ),
      MaintenanceIssues AS (
        SELECT 
          DATE(mi.issue_date) as cost_date,
          SUM(mii.quantity * mii.unit_price) as maintenance_cost
        FROM maintenance_issues mi
        JOIN maintenance_issue_items mii ON mi.id = mii.issue_id
        WHERE DATE(mi.issue_date) >= $1
        GROUP BY DATE(mi.issue_date)
      ),
      DailyLabor AS (
        SELECT 
          a.attendance_date,
          SUM(e.salary / 30.0) as daily_salary_cost
        FROM daily_attendance a
        JOIN employees e ON a.employee_id = e.id
        WHERE DATE(a.attendance_date) >= $1
        GROUP BY a.attendance_date
      ),
      ContractorsCost AS (
        SELECT SUM(monthly_salary) / 31.0 as daily_contractors_cost
        FROM contractors
        WHERE status = 'ACTIVE'
      )
      SELECT 
        DATE(p.date_time) as date,
        p.id,
        p.total_weight,
        p.paper_type,
        p.electricity_units,
        p.electricity_cost,
        p.boiler_fuel_quantity,
        p.boiler_fuel_type,
        COALESCE((
          SELECT lp.latest_price 
          FROM LatestPrices lp 
          WHERE lp.item_type = p.boiler_fuel_type
        ), 0) as boiler_fuel_price,
        json_agg(
          json_build_object(
            'raddi_type', pr.raddi_type,
            'quantity_used', pr.quantity_used,
            'unit_price', COALESCE(lp.latest_price, 0)
          )
        ) as recipe,
        COALESCE(mi.maintenance_cost, 0) as maintenance_cost,
        COALESCE(dl.daily_salary_cost, 0) as labor_cost,
        COALESCE((SELECT daily_contractors_cost FROM ContractorsCost), 0) as contractors_cost,
        COALESCE(de.daily_expense, 0) as daily_expenses
      FROM production p
      LEFT JOIN production_recipe pr ON p.id = pr.production_id
      LEFT JOIN LatestPrices lp ON pr.raddi_type = lp.item_type
      LEFT JOIN MaintenanceIssues mi ON DATE(p.date_time) = mi.cost_date
      LEFT JOIN DailyLabor dl ON DATE(p.date_time) = dl.attendance_date
      LEFT JOIN DailyExpenses de ON DATE(p.date_time) = de.expense_date
      WHERE DATE(p.date_time) >= $1
      GROUP BY 
        p.id, 
        p.date_time,
        p.total_weight,
        p.paper_type,
        p.electricity_units,
        p.electricity_cost,
        p.boiler_fuel_quantity,
        p.boiler_fuel_type,
        mi.maintenance_cost,
        dl.daily_salary_cost,
        de.daily_expense
      ORDER BY DATE(p.date_time) DESC
      LIMIT 7
    `, [start]);

    const formattedData = result.rows.map(row => {
      const recipe = Array.isArray(row.recipe) ? row.recipe : [];
      const raddiCost = recipe.reduce((total, item) => {
        return total + (parseFloat(item.quantity_used || 0) * parseFloat(item.unit_price || 0));
      }, 0);

      const boilerFuelCost = parseFloat(row.boiler_fuel_quantity || 0) * parseFloat(row.boiler_fuel_price || 0);
      const electricityCost = parseFloat(row.electricity_cost || 0);
      const maintenanceCost = parseFloat(row.maintenance_cost || 0);
      const laborCost = parseFloat(row.labor_cost || 0);
      const contractorsCost = parseFloat(row.contractors_cost || 0);
      const dailyExpenses = parseFloat(row.daily_expenses || 0);

      const totalCost = raddiCost + boilerFuelCost + electricityCost + maintenanceCost + 
                       laborCost + contractorsCost + dailyExpenses;

      const costPerKg = (totalCost / parseFloat(row.total_weight || 1)).toFixed(2);

      return {
        date: row.date,
        total_weight: Number(row.total_weight || 0),
        paper_types: row.paper_type || '',
        electricity_units: Number(row.electricity_units || 0),
        cost_per_unit: Number(costPerKg),
        recipe: row.recipe,
        boiler_fuel_quantity: row.boiler_fuel_quantity,
        boiler_fuel_price: row.boiler_fuel_price,
        electricity_cost: row.electricity_cost,
        maintenance_cost: row.maintenance_cost,
        labor_cost: row.labor_cost,
        contractors_cost: row.contractors_cost,
        daily_expenses: row.daily_expenses
      };
    });

    res.json(formattedData.reverse());
  } catch (error) {
    console.error('Error fetching daily production stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 