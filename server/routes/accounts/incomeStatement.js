const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get income statement data
router.get('/:month/:year', async (req, res) => {
  const client = await pool.connect();
  try {
    const { month, year } = req.params;
    
    // Get total labor cost from workers_salary_totals
    const salaryQuery = `
      SELECT 
        COALESCE((
          SELECT total_amount 
          FROM workers_salary_totals 
          WHERE month = $1 AND year = $2
        ), 0) as total_labor_cost
    `;
    
    // Get raddi and boiler fuel consumption with costs
    const materialsQuery = `
      WITH LatestPrices AS (
        SELECT DISTINCT ON (item_type) 
          item_type,
          price_per_unit as unit_price
        FROM gate_entries ge
        JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
        WHERE ge.entry_type = 'PURCHASE_IN'
        ORDER BY item_type, ge.date_time DESC
      )
      SELECT 
        pr.raddi_type,
        SUM(pr.quantity_used) as total_quantity,
        lp.unit_price,
        SUM(pr.quantity_used * lp.unit_price) as total_cost
      FROM production p
      JOIN production_recipe pr ON p.id = pr.production_id
      LEFT JOIN LatestPrices lp ON pr.raddi_type = lp.item_type
      WHERE EXTRACT(MONTH FROM p.date_time) = $1 
      AND EXTRACT(YEAR FROM p.date_time) = $2
      GROUP BY pr.raddi_type, lp.unit_price
    `;

    // Get boiler fuel consumption with costs
    const boilerQuery = `
      WITH LatestPrices AS (
        SELECT DISTINCT ON (item_type) 
          item_type,
          price_per_unit as unit_price
        FROM gate_entries ge
        JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
        WHERE ge.entry_type = 'PURCHASE_IN'
        ORDER BY item_type, ge.date_time DESC
      )
      SELECT 
        p.boiler_fuel_type,
        SUM(p.boiler_fuel_quantity) as total_quantity,
        lp.unit_price,
        SUM(p.boiler_fuel_quantity * lp.unit_price) as total_cost
      FROM production p
      LEFT JOIN LatestPrices lp ON p.boiler_fuel_type = lp.item_type
      WHERE EXTRACT(MONTH FROM p.date_time) = $1 
      AND EXTRACT(YEAR FROM p.date_time) = $2
      AND p.boiler_fuel_type IS NOT NULL
      GROUP BY p.boiler_fuel_type, lp.unit_price
    `;
    
    // Get energy consumption data
    const energyQuery = `
      SELECT 
        SUM(electricity_units) as total_units,
        SUM(electricity_cost) as total_cost,
        CASE 
          WHEN SUM(electricity_units) > 0 
          THEN SUM(electricity_cost) / SUM(electricity_units)
          ELSE 0 
        END as average_rate
      FROM production
      WHERE EXTRACT(MONTH FROM date_time) = $1 
      AND EXTRACT(YEAR FROM date_time) = $2
    `;

    // Get maintenance cost for the month
    const maintenanceQuery = `
      SELECT COALESCE(SUM(mii.quantity * mii.unit_price), 0) as total_maintenance_cost
      FROM maintenance_issues mi
      JOIN maintenance_issue_items mii ON mi.id = mii.issue_id
      WHERE EXTRACT(MONTH FROM mi.issue_date) = $1 
      AND EXTRACT(YEAR FROM mi.issue_date) = $2
    `;

    // Get production data
    const productionQuery = `
      SELECT 
        paper_type,
        SUM(total_weight) as total_production,
        COUNT(*) as total_entries
      FROM production
      WHERE EXTRACT(MONTH FROM date_time) = $1 
      AND EXTRACT(YEAR FROM date_time) = $2
      GROUP BY paper_type
    `;

    // Get average sale prices for each paper type
    const salePricesQuery = `
      WITH ProcessedSales AS (
        SELECT 
          ge.paper_type,
          gep.price_per_unit,
          gep.final_quantity,
          ge.date_time
        FROM gate_entries_pricing gep
        JOIN gate_entries ge ON gep.grn_number = ge.grn_number
        WHERE gep.entry_type = 'SALE'
        AND gep.status = 'PROCESSED'
        AND EXTRACT(MONTH FROM ge.date_time) = $1 
        AND EXTRACT(YEAR FROM ge.date_time) = $2
      )
      SELECT 
        paper_type,
        ROUND(AVG(price_per_unit), 2) as avg_sale_price,
        SUM(final_quantity) as total_quantity_sold
      FROM ProcessedSales
      GROUP BY paper_type
    `;

    // Add query for adjustments
    const adjustmentsQuery = `
      SELECT 
        category,
        adjustment_amount,
        remarks,
        current_value,
        new_value
      FROM income_statement_adjustments
      WHERE month = $1 AND year = $2
    `;

    // Add query for monthly expenses
    const expensesQuery = `
      WITH expense_payments AS (
        SELECT 
          account_type as expense_type,
          SUM(amount) as total_amount
        FROM payments
        WHERE EXTRACT(MONTH FROM payment_date) = $1 
        AND EXTRACT(YEAR FROM payment_date) = $2
        AND (account_type = 'EXPENSE' OR account_type = 'OTHER')
        GROUP BY account_type
      ),
      regular_expenses AS (
        SELECT 
          expense_type,
          SUM(amount) as total_amount
        FROM expenses
        WHERE EXTRACT(MONTH FROM date) = $1 
        AND EXTRACT(YEAR FROM date) = $2
        GROUP BY expense_type
      )
      SELECT 
        expense_type,
        SUM(total_amount) as total_amount
      FROM (
        SELECT * FROM expense_payments
        UNION ALL
        SELECT * FROM regular_expenses
      ) combined_expenses
      GROUP BY expense_type
    `;

    // Execute all queries in parallel
    const [
      salaryResult, 
      materialsResult, 
      boilerResult, 
      energyResult, 
      maintenanceResult,
      productionResult,
      salePricesResult,
      adjustmentsResult,
      expensesResult
    ] = await Promise.all([
      client.query(salaryQuery, [month, year]),
      client.query(materialsQuery, [month, year]),
      client.query(boilerQuery, [month, year]),
      client.query(energyQuery, [month, year]),
      client.query(maintenanceQuery, [month, year]),
      client.query(productionQuery, [month, year]),
      client.query(salePricesQuery, [month, year]),
      client.query(adjustmentsQuery, [month, year]),
      client.query(expensesQuery, [month, year])
    ]);

    const salaryData = salaryResult.rows[0];
    const materialsData = materialsResult.rows;
    const boilerData = boilerResult.rows;
    const energyData = energyResult.rows[0];
    const maintenanceData = maintenanceResult.rows[0];

    // Calculate total materials cost including adjustments
    const totalMaterialsCost = materialsData.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
    const adjustedMaterialsCost = materialsData.reduce((sum, item) => {
      const adjustment = adjustmentsResult.rows.find(adj => 
        adj.remarks.split(' - ')[0].toLowerCase() === item.raddi_type.toLowerCase()
      );
      const cost = adjustment ? 
        parseFloat(adjustment.new_value) * parseFloat(item.unit_price || 0) : 
        parseFloat(item.total_cost || 0);
      return sum + cost;
    }, 0);

    // Calculate total boiler fuel cost including adjustments
    const totalBoilerCost = boilerData.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
    const adjustedBoilerCost = boilerData.reduce((sum, item) => {
      const adjustment = adjustmentsResult.rows.find(adj => 
        adj.remarks.split(' - ')[0].toLowerCase() === item.boiler_fuel_type.toLowerCase()
      );
      const cost = adjustment ? 
        parseFloat(adjustment.new_value) * parseFloat(item.unit_price || 0) : 
        parseFloat(item.total_cost || 0);
      return sum + cost;
    }, 0);

    // Get energy adjustment if exists
    const energyAdjustment = adjustmentsResult.rows.find(adj => adj.category === 'ENERGY');
    const adjustedEnergyCost = energyAdjustment ? 
      parseFloat(energyAdjustment.new_value) : 
      parseFloat(energyData?.total_cost || 0);

    // Calculate total expenses including the new expenses
    const additionalExpenses = expensesResult.rows.reduce((sum, expense) => 
      sum + parseFloat(expense.total_amount || 0), 0
    );

    // Calculate total expenses with both original and adjusted values
    const totalExpenses = parseFloat(salaryData.total_labor_cost) + 
                         totalMaterialsCost + 
                         totalBoilerCost + 
                         parseFloat(energyData.total_cost || 0) + 
                         parseFloat(maintenanceData.total_maintenance_cost || 0) +
                         additionalExpenses;

    const adjustedTotalExpenses = parseFloat(salaryData.total_labor_cost) + 
                                adjustedMaterialsCost + 
                                adjustedBoilerCost + 
                                adjustedEnergyCost + 
                                parseFloat(maintenanceData.total_maintenance_cost || 0) +
                                additionalExpenses;

    // Calculate revenue and profit for each paper type
    const productionData = productionResult.rows.map(prod => {
      const salesData = salePricesResult.rows.find(sale => sale.paper_type === prod.paper_type) || {
        avg_sale_price: 0,
        total_quantity_sold: 0
      };

      // Calculate revenue based on total production instead of sales
      const revenue = parseFloat(prod.total_production || 0) * parseFloat(salesData.avg_sale_price || 0);
      
      return {
        paperType: prod.paper_type,
        totalProduction: parseFloat(prod.total_production || 0),
        totalSold: parseFloat(salesData.total_quantity_sold || 0),
        averagePrice: parseFloat(salesData.avg_sale_price || 0),
        revenue: revenue
      };
    });

    // Calculate total revenue and profit
    const totalRevenue = productionData.reduce((sum, item) => sum + item.revenue, 0);
    const netProfit = totalRevenue - totalExpenses;
    const adjustedNetProfit = totalRevenue - adjustedTotalExpenses;

    // Process adjustments and apply to respective categories
    const adjustments = adjustmentsResult.rows;
    
    // Process material adjustments
    const materialAdjustments = adjustments.filter(adj => adj.category === 'MATERIALS');

    // Add this after processing material adjustments
    const boilerFuelAdjustments = adjustments.filter(adj => adj.category === 'BOILER_FUEL');

    // Add console.log to debug
    console.log('Adjustments:', adjustments);
    console.log('Material Adjustments:', materialAdjustments);
    console.log('Boiler Adjustments:', boilerFuelAdjustments);

    // Modify the response to include both original and adjusted values
    res.json({
      labor: {
        total: parseFloat(salaryData?.total_labor_cost || 0)
      },
      materials: {
        items: materialsData?.map(item => {
          const adjustment = materialAdjustments.find(adj => 
            adj.remarks.split(' - ')[0].toLowerCase() === item.raddi_type.toLowerCase()
          );
          
          return {
            type: item.raddi_type || '',
            quantity: parseFloat(item.total_quantity || 0),
            adjustedQuantity: adjustment ? parseFloat(adjustment.new_value) : parseFloat(item.total_quantity || 0),
            unitPrice: parseFloat(item.unit_price || 0),
            totalCost: parseFloat(item.total_cost || 0),
            adjustedCost: adjustment ? 
              parseFloat(adjustment.new_value) * parseFloat(item.unit_price || 0) : 
              parseFloat(item.total_cost || 0)
          };
        }) || [],
        total: totalMaterialsCost || 0,
        adjustedTotal: adjustedMaterialsCost || 0
      },
      boilerFuel: {
        items: boilerData?.map(item => {
          const adjustment = boilerFuelAdjustments.find(adj => {
            const itemType = item.boiler_fuel_type?.toLowerCase();
            const adjType = adj.remarks?.split(' - ')[0]?.toLowerCase();
            return itemType === adjType;
          });
          
          return {
            type: item.boiler_fuel_type || '',
            quantity: parseFloat(item.total_quantity || 0),
            adjustedQuantity: adjustment ? parseFloat(adjustment.new_value) : parseFloat(item.total_quantity || 0),
            unitPrice: parseFloat(item.unit_price || 0),
            totalCost: parseFloat(item.total_cost || 0),
            adjustedCost: adjustment ? 
              parseFloat(adjustment.new_value) * parseFloat(item.unit_price || 0) : 
              parseFloat(item.total_cost || 0)
          };
        }) || [],
        total: totalBoilerCost || 0,
        adjustedTotal: adjustedBoilerCost || 0
      },
      energy: {
        totalUnits: parseFloat(energyData?.total_units || 0),
        averageRate: parseFloat(energyData?.average_rate || 0),
        totalCost: parseFloat(energyData?.total_cost || 0),
        adjustedCost: adjustedEnergyCost
      },
      maintenance: {
        total: parseFloat(maintenanceData?.total_maintenance_cost || 0)
      },
      production: {
        items: productionData || [],
        totalRevenue: totalRevenue || 0
      },
      adjustments: adjustments || [],
      expenses: {
        items: expensesResult.rows.map(expense => ({
          type: expense.expense_type,
          amount: parseFloat(expense.total_amount || 0)
        })),
        total: additionalExpenses
      },
      summary: {
        totalExpenses: totalExpenses || 0,
        adjustedTotalExpenses: adjustedTotalExpenses || 0,
        totalRevenue: totalRevenue || 0,
        netProfit: netProfit || 0,
        adjustedNetProfit: adjustedNetProfit || 0,
        profitMargin: totalRevenue > 0 ? ((netProfit || 0) / totalRevenue * 100) : 0,
        adjustedProfitMargin: totalRevenue > 0 ? ((adjustedNetProfit || 0) / totalRevenue * 100) : 0
      }
    });

  } catch (error) {
    console.error('Error generating income statement:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update the POST adjustments endpoint
router.post('/adjustments', async (req, res) => {
  const client = await pool.connect();
  try {
    const { month, year, category, subType, newValue, remarks } = req.body;
    
    // Check if the month has ended
    const currentDate = new Date();
    const adjustmentDate = new Date(year, month - 1);
    const firstDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    if (adjustmentDate >= firstDayOfCurrentMonth) {
      return res.status(400).json({ 
        error: 'Adjustments can only be made for past months' 
      });
    }

    // For MATERIALS and BOILER_FUEL, subType must be included
    if ((category === 'MATERIALS' || category === 'BOILER_FUEL') && !subType) {
      return res.status(400).json({ error: 'SubType is required for this category' });
    }

    // Get current value based on category
    let currentValue = 0;
    switch (category) {
      case 'LABOR':
        const laborQuery = `
          SELECT COALESCE(total_amount, 0) as value
          FROM workers_salary_totals 
          WHERE month = $1 AND year = $2
        `;
        const laborResult = await client.query(laborQuery, [month, year]);
        currentValue = parseFloat(laborResult.rows[0]?.value || 0);
        break;

      case 'MATERIALS':
        const materialsQuery = `
          WITH LatestPrices AS (
            SELECT DISTINCT ON (item_type) 
              item_type, price_per_unit
            FROM gate_entries ge
            JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
            WHERE ge.entry_type = 'PURCHASE_IN'
            ORDER BY item_type, ge.date_time DESC
          )
          SELECT COALESCE(SUM(pr.quantity_used * lp.price_per_unit), 0) as value
          FROM production p
          JOIN production_recipe pr ON p.id = pr.production_id
          LEFT JOIN LatestPrices lp ON pr.raddi_type = lp.item_type
          WHERE EXTRACT(MONTH FROM p.date_time) = $1 
          AND EXTRACT(YEAR FROM p.date_time) = $2
        `;
        const materialsResult = await client.query(materialsQuery, [month, year]);
        currentValue = parseFloat(materialsResult.rows[0]?.value || 0);
        break;

      case 'BOILER_FUEL':
        const boilerQuery = `
          SELECT COALESCE(SUM(boiler_fuel_quantity), 0) as value
          FROM production
          WHERE EXTRACT(MONTH FROM date_time) = $1 
          AND EXTRACT(YEAR FROM date_time) = $2
        `;
        const boilerResult = await client.query(boilerQuery, [month, year]);
        currentValue = parseFloat(boilerResult.rows[0]?.value || 0);
        break;

      case 'ENERGY':
        const energyQuery = `
          SELECT COALESCE(SUM(electricity_cost), 0) as value
          FROM production
          WHERE EXTRACT(MONTH FROM date_time) = $1 
          AND EXTRACT(YEAR FROM date_time) = $2
        `;
        const energyResult = await client.query(energyQuery, [month, year]);
        currentValue = parseFloat(energyResult.rows[0]?.value || 0);
        break;
    }

    // Calculate adjustment amount
    const adjustmentAmount = newValue - currentValue;
    
    // Include the subType in remarks
    const finalRemarks = `${subType}${remarks ? ` - ${remarks}` : ''}`;

    await client.query('BEGIN'); // Start transaction

    // Insert income statement adjustment
    const adjustmentQuery = `
      INSERT INTO income_statement_adjustments 
      (month, year, category, adjustment_amount, remarks, current_value, new_value)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const adjustmentResult = await client.query(adjustmentQuery, [
      month, year, category, adjustmentAmount, finalRemarks, currentValue, newValue
    ]);

    // If the adjustment is for materials or boiler fuel, update stock
    if (category === 'MATERIALS' || category === 'BOILER_FUEL') {
      // The quantity difference is negative because if we used more, we need to reduce stock
      const quantityDifference = -(newValue - currentValue);
      
      // Insert stock adjustment
      const stockAdjustmentQuery = `
        INSERT INTO stock_adjustments
        (
          item_type, 
          quantity, 
          adjustment_type, 
          reference_type,
          reference_id,
          date_time
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      const adjustmentType = quantityDifference < 0 ? 'DECREASE' : 'INCREASE';

      await client.query(stockAdjustmentQuery, [
        subType,
        Math.abs(quantityDifference), // Always store positive quantity
        adjustmentType,
        'INCOME_STATEMENT',           // reference_type
        adjustmentResult.rows[0].id,  // reference_id from the income statement adjustment
        adjustmentDate
      ]);
    }

    await client.query('COMMIT'); // Commit transaction
    res.json(adjustmentResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Error adding adjustment:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Add endpoint to get raw material types
router.get('/materials-types/:month/:year', async (req, res) => {
  const client = await pool.connect();
  try {
    const { month, year } = req.params;
    
    const query = `
      SELECT 
        pr.raddi_type,
        COALESCE(SUM(pr.quantity_used), 0) as total_quantity
      FROM production p
      JOIN production_recipe pr ON p.id = pr.production_id
      WHERE EXTRACT(MONTH FROM p.date_time) = $1 
      AND EXTRACT(YEAR FROM p.date_time) = $2
      GROUP BY pr.raddi_type
    `;
    
    const result = await client.query(query, [month, year]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching material types:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Update current-value endpoint
router.get('/current-value/:month/:year/:category/:subType?', async (req, res) => {
  const client = await pool.connect();
  try {
    const { month, year, category, subType } = req.params;
    let currentValue = 0;

    switch (category) {
      case 'MATERIALS':
        const materialsQuery = `
          SELECT COALESCE(SUM(pr.quantity_used), 0) as value
          FROM production p
          JOIN production_recipe pr ON p.id = pr.production_id
          WHERE EXTRACT(MONTH FROM p.date_time) = $1 
          AND EXTRACT(YEAR FROM p.date_time) = $2
          AND pr.raddi_type = $3
        `;
        const materialsResult = await client.query(materialsQuery, [month, year, subType]);
        currentValue = parseFloat(materialsResult.rows[0]?.value || 0);
        break;

      case 'BOILER_FUEL':
        const boilerQuery = `
          SELECT COALESCE(SUM(boiler_fuel_quantity), 0) as value
          FROM production
          WHERE EXTRACT(MONTH FROM date_time) = $1 
          AND EXTRACT(YEAR FROM date_time) = $2
        `;
        const boilerResult = await client.query(boilerQuery, [month, year]);
        currentValue = parseFloat(boilerResult.rows[0]?.value || 0);
        break;

      case 'ENERGY':
        const energyQuery = `
          SELECT COALESCE(SUM(electricity_cost), 0) as value
          FROM production
          WHERE EXTRACT(MONTH FROM date_time) = $1 
          AND EXTRACT(YEAR FROM date_time) = $2
        `;
        const energyResult = await client.query(energyQuery, [month, year]);
        currentValue = parseFloat(energyResult.rows[0]?.value || 0);
        break;
    }

    res.json({ currentValue });
  } catch (error) {
    console.error('Error fetching current value:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Add endpoint to get boiler fuel types
router.get('/boiler-fuel-types/:month/:year', async (req, res) => {
  const client = await pool.connect();
  try {
    const { month, year } = req.params;
    
    const query = `
      SELECT 
        boiler_fuel_type,
        COALESCE(SUM(boiler_fuel_quantity), 0) as total_quantity
      FROM production
      WHERE EXTRACT(MONTH FROM date_time) = $1 
      AND EXTRACT(YEAR FROM date_time) = $2
      AND boiler_fuel_type IS NOT NULL
      GROUP BY boiler_fuel_type
    `;
    
    const result = await client.query(query, [month, year]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching boiler fuel types:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router; 