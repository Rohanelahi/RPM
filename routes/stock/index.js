const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get stock overview with monthly average prices
router.get('/overview', async (req, res) => {
  try {
    const result = await pool.query(
      `WITH LatestPrices AS (
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
      MonthlyAverages AS (
        SELECT 
          item_type,
          AVG(price_per_unit) as avg_price,
          DATE_TRUNC('month', date_time) as month
        FROM (
          SELECT 
            ge.item_type,
            gep.price_per_unit,
            ge.date_time
          FROM gate_entries ge
          JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
          WHERE ge.entry_type = 'PURCHASE_IN'
          AND ge.date_time >= DATE_TRUNC('month', CURRENT_DATE)
          AND ge.date_time < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        ) current_month
        GROUP BY item_type, DATE_TRUNC('month', date_time)
      )
      SELECT 
        combined_stock.item_type,
        SUM(
          CASE 
            WHEN combined_stock.source_type = 'GATE_ENTRY' THEN
              CASE 
                WHEN combined_stock.entry_type = 'PURCHASE_IN' THEN COALESCE(combined_stock.final_quantity, combined_stock.quantity)
                WHEN combined_stock.entry_type = 'PURCHASE_RETURN' THEN -COALESCE(combined_stock.final_quantity, combined_stock.quantity)
                WHEN combined_stock.entry_type = 'SALE_OUT' THEN -combined_stock.quantity
                WHEN combined_stock.entry_type = 'SALE_RETURN' THEN combined_stock.quantity
              END
            WHEN combined_stock.source_type = 'STOCK_ADJUSTMENT' THEN combined_stock.quantity
          END
        ) as current_quantity,
        combined_stock.unit,
        MAX(combined_stock.date_time) as last_updated,
        lp.latest_price,
        ma.avg_price as monthly_avg_price
      FROM (
        SELECT 
          ge.item_type,
          ge.quantity,
          gep.final_quantity,
          ge.entry_type,
          ge.unit,
          ge.date_time,
          'GATE_ENTRY' as source_type
        FROM gate_entries ge
        LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
        WHERE ge.entry_type IN ('PURCHASE_IN', 'PURCHASE_RETURN', 'SALE_OUT', 'SALE_RETURN')
        
        UNION ALL
        
        SELECT 
          sa.item_type,
          CASE 
            WHEN sa.adjustment_type = 'DECREASE' THEN -sa.quantity
            ELSE sa.quantity
          END as quantity,
          NULL as final_quantity,
          sa.adjustment_type as entry_type,
          'KG' as unit,
          sa.date_time,
          'STOCK_ADJUSTMENT' as source_type
        FROM stock_adjustments sa
      ) combined_stock
      LEFT JOIN LatestPrices lp ON combined_stock.item_type = lp.item_type
      LEFT JOIN MonthlyAverages ma ON combined_stock.item_type = ma.item_type
      GROUP BY 
        combined_stock.item_type, 
        combined_stock.unit, 
        lp.latest_price,
        ma.avg_price
      HAVING SUM(
        CASE 
          WHEN combined_stock.source_type = 'GATE_ENTRY' THEN
            CASE 
              WHEN combined_stock.entry_type = 'PURCHASE_IN' THEN COALESCE(combined_stock.final_quantity, combined_stock.quantity)
              WHEN combined_stock.entry_type = 'PURCHASE_RETURN' THEN -COALESCE(combined_stock.final_quantity, combined_stock.quantity)
              WHEN combined_stock.entry_type = 'SALE_OUT' THEN -combined_stock.quantity
              WHEN combined_stock.entry_type = 'SALE_RETURN' THEN combined_stock.quantity
            END
          WHEN combined_stock.source_type = 'STOCK_ADJUSTMENT' THEN combined_stock.quantity
        END
      ) > 0
      ORDER BY combined_stock.item_type`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stock history
router.get('/history', async (req, res) => {
  try {
    const { itemType, supplierId, startDate, endDate } = req.query;
    let params = [];
    let conditions = ['ge.entry_type = \'PURCHASE_IN\''];
    
    let query = `
      SELECT 
        ge.id,
        ge.date_time as date,
        ge.grn_number as reference_number,
        ge.item_type,
        COALESCE(gep.final_quantity, ge.quantity) as quantity,
        ge.unit,
        a.account_name as supplier_name,
        gep.price_per_unit as price,
        (COALESCE(gep.final_quantity, ge.quantity) * COALESCE(gep.price_per_unit, 0)) as total_amount
      FROM gate_entries ge
      LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      LEFT JOIN accounts a ON ge.supplier_id::text = a.id::text
      WHERE a.account_type = 'SUPPLIER'
    `;
    
    if (itemType) {
      params.push(itemType);
      conditions.push(`ge.item_type = $${params.length}`);
    }
    
    if (supplierId) {
      params.push(supplierId);
      conditions.push(`ge.supplier_id = $${params.length}`);
    }
    
    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      params.push(new Date(startDate));
      conditions.push(`ge.date_time >= $${params.length}`);
    }
    
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      params.push(new Date(endDate));
      conditions.push(`ge.date_time <= $${params.length}`);
    }
    
    query += ` AND ${conditions.join(' AND ')} ORDER BY ge.date_time DESC`;

    console.log('Query:', query);
    console.log('Params:', params);

    const result = await pool.query(query, params);
    console.log('Stock history result:', result.rows);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add new endpoint to save monthly averages
router.post('/monthly-averages', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the previous month's dates
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const monthStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
    const monthEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

    // Calculate and save monthly averages
    await client.query(`
      INSERT INTO monthly_price_averages (
        item_type,
        month,
        year,
        average_price
      )
      SELECT 
        item_type,
        EXTRACT(MONTH FROM date_time) as month,
        EXTRACT(YEAR FROM date_time) as year,
        AVG(price_per_unit) as average_price
      FROM gate_entries ge
      JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      WHERE ge.entry_type = 'PURCHASE_IN'
      AND ge.date_time >= $1
      AND ge.date_time <= $2
      GROUP BY item_type, EXTRACT(MONTH FROM date_time), EXTRACT(YEAR FROM date_time)
      ON CONFLICT (item_type, month, year) 
      DO UPDATE SET average_price = EXCLUDED.average_price
    `, [monthStart, monthEnd]);

    await client.query('COMMIT');
    res.json({ message: 'Monthly averages saved successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving monthly averages:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Add a new endpoint for item summary
router.get('/item-summary', async (req, res) => {
  try {
    const { startDate, endDate, supplierId } = req.query;
    let params = [];
    let conditions = ['ge.entry_type = \'PURCHASE_IN\''];
    
    let query = `
      SELECT 
        ge.item_type,
        SUM(COALESCE(gep.final_quantity, ge.quantity)) as total_quantity,
        ge.unit,
        AVG(gep.price_per_unit) as avg_price,
        SUM(COALESCE(gep.final_quantity, ge.quantity) * COALESCE(gep.price_per_unit, 0)) as total_amount
      FROM gate_entries ge
      LEFT JOIN gate_entries_pricing gep ON ge.grn_number = gep.grn_number
      LEFT JOIN accounts a ON ge.supplier_id::text = a.id::text
      WHERE a.account_type = 'SUPPLIER'
    `;
    
    if (supplierId) {
      params.push(supplierId);
      conditions.push(`ge.supplier_id = $${params.length}`);
    }
    
    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      params.push(new Date(startDate));
      conditions.push(`ge.date_time >= $${params.length}`);
    }
    
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      params.push(new Date(endDate));
      conditions.push(`ge.date_time <= $${params.length}`);
    }
    
    query += ` AND ${conditions.join(' AND ')} GROUP BY ge.item_type, ge.unit ORDER BY ge.item_type`;

    console.log('Item Summary Query:', query);
    console.log('Params:', params);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching item summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 