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
      recipe,
      totalYield
    } = req.body;

    // Validate numeric fields
    const validatedTotalWeight = totalWeight === '' ? 0 : parseFloat(totalWeight);
    const validatedBoilerFuelQuantity = boilerFuelQuantity === '' ? 0 : parseFloat(boilerFuelQuantity);
    const validatedBoilerFuelCost = boilerFuelCost === '' ? 0 : parseFloat(boilerFuelCost);
    const validatedTotalYield = totalYield === '' ? 0 : parseFloat(totalYield);

    // Insert main production record
    const productionResult = await client.query(
      `INSERT INTO production (
        date_time,
        paper_type,
        total_weight,
        total_reels,
        boiler_fuel_type,
        boiler_fuel_quantity,
        boiler_fuel_cost,
        total_yield_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [
        new Date(date),
        paperType,
        validatedTotalWeight,
        reels.length,
        boilerFuelType || null,
        validatedBoilerFuelQuantity,
        validatedBoilerFuelCost,
        validatedTotalYield
      ]
    );

    const productionId = productionResult.rows[0].id;

    // Insert reels with validation (removed reel_number)
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

    // Insert recipe items with validation (added yield)
    for (const item of recipe) {
      const validatedPercentage = item.percentageUsed === '' ? 0 : parseFloat(item.percentageUsed);
      const validatedQuantity = item.quantityUsed === '' ? 0 : parseFloat(item.quantityUsed);
      const validatedYield = item.yield === '' ? 0 : parseFloat(item.yield);
      await client.query(
        `INSERT INTO production_recipe (
          production_id,
          raddi_type,
          percentage_used,
          quantity_used,
          yield_percentage
        ) VALUES ($1, $2, $3, $4, $5)`,
        [productionId, item.raddiType || '', validatedPercentage, validatedQuantity, validatedYield]
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
        ) as recipe
      FROM production p
      LEFT JOIN production_reels pr ON p.id = pr.production_id
      LEFT JOIN production_recipe recipe ON p.id = recipe.production_id
    `;

    if (paperType) {
      conditions.push(`p.paper_type = $${paramCount}`);
      params.push(paperType);
      paramCount++;
    }

    if (startDate) {
      conditions.push(`p.date_time >= $${paramCount}`);
      params.push(new Date(startDate));
      paramCount++;
    }

    if (endDate) {
      conditions.push(`p.date_time <= $${paramCount}`);
      params.push(new Date(endDate));
      paramCount++;
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