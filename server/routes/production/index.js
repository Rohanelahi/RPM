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
      reels,
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

    // Validate numeric fields
    const validatedTotalWeight = totalWeight === '' ? 0 : parseFloat(totalWeight);
    const validatedBoilerFuelQuantity = boilerFuelQuantity === '' ? 0 : parseFloat(boilerFuelQuantity);
    const validatedBoilerFuelCost = boilerFuelCost === '' ? 0 : parseFloat(boilerFuelCost);
    const validatedElectricityUnits = electricityUnits === '' ? 0 : parseFloat(electricityUnits);
    const validatedElectricityUnitPrice = electricityUnitPrice === '' ? 0 : parseFloat(electricityUnitPrice);
    const validatedElectricityCost = electricityCost === '' ? 0 : parseFloat(electricityCost);
    const validatedTotalYield = totalYield === '' ? 0 : parseFloat(totalYield);

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
        reels.length,
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

    // Insert reels with validation
    for (const reel of reels) {
      const validatedWeight = reel.weight === '' ? 0 : parseFloat(reel.weight);
      await client.query(
        `INSERT INTO production_reels (
          production_id,
          size,
          weight
        ) VALUES ($1, $2, $3)`,
        [productionId, reel.size || '', validatedWeight]
      );
    }

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
      SELECT 
        p.*,
        json_agg(
          json_build_object(
            'id', pr.id,
            'size', pr.size,
            'weight', pr.weight
          )
        ) as reels,
        json_agg(
          json_build_object(
            'id', recipe.id,
            'raddi_type', recipe.raddi_type,
            'percentage_used', recipe.percentage_used,
            'quantity_used', recipe.quantity_used,
            'yield_percentage', recipe.yield_percentage
          )
        ) as recipe,
        p.electricity_units,
        p.electricity_unit_price,
        p.electricity_cost
      FROM production p
      LEFT JOIN production_reels pr ON p.id = pr.production_id
      LEFT JOIN production_recipe recipe ON p.id = recipe.production_id
    `;

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

    query += ` GROUP BY p.id ORDER BY p.date_time DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching production history:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 