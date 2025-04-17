const express = require('express');
const router = express.Router();
const pool = require('../../../db');

const purchaseEntries = require('./purchaseEntries');
const purchaseReturns = require('./purchaseReturns');
const saleEntries = require('./saleEntries');
const saleReturns = require('./saleReturns');
const storeReturns = require('./storeReturns');

// Mount all pending entry routes
router.use('/pending', purchaseEntries);
router.use('/pending', purchaseReturns);
router.use('/pending', saleEntries);
router.use('/pending', saleReturns);
router.use('/pending', storeReturns);

// Get all pending entries (combined)
router.get('/pending-entries', async (req, res) => {
  try {
    const { userRole } = req.query;

    // Test query first
    const testQuery = await pool.query(
      `SELECT 1 FROM public.pricing_entries LIMIT 1`
    ).catch(error => {
      console.error('Test query error:', error);
      throw error;
    });

    console.log('Test query successful');

    // Get gate entries
    const gateQuery = `
      SELECT 
        gep.id as pricing_id,
        gep.entry_type,
        gep.grn_number,
        gep.account_id,
        gep.quantity,
        gep.status,
        ge.unit as original_unit,
        ge.paper_type as original_paper_type,
        ge.purchaser_id,
        s.account_name as supplier_name,
        p.account_name as purchaser_name,
        a.account_name,
        gr.return_number,
        gr.return_reason,
        gr.return_quantity,
        gr.date_time as return_date,
        gr.vehicle_type,
        gr.vehicle_number,
        gr.driver_name,
        CASE 
          WHEN gr.return_type = 'SALE_RETURN' THEN ge.paper_type
          WHEN gep.entry_type = 'SALE' THEN ge.paper_type
          ELSE ge.item_type
        END as item_type,
        CASE
          WHEN gr.return_type = 'SALE_RETURN' THEN 'SALE_RETURN'
          WHEN gr.return_type = 'PURCHASE_RETURN' THEN 'PURCHASE_RETURN'
          WHEN gep.entry_type = 'SALE' THEN 'SALE'
          ELSE 'PURCHASE'
        END as entry_type,
        COALESCE(ge.unit, 'KG') as unit,
        COALESCE(gr.date_time, ge.date_time) as date_time
       FROM gate_entries_pricing gep
       LEFT JOIN gate_returns gr ON gr.return_number = gep.grn_number
       LEFT JOIN gate_entries ge ON CASE 
         WHEN gr.return_type IN ('SALE_RETURN', 'PURCHASE_RETURN') THEN gr.original_grn_number
         ELSE gep.grn_number 
       END = ge.grn_number
       LEFT JOIN accounts s ON ge.supplier_id = s.id
       LEFT JOIN accounts p ON ge.purchaser_id = p.id
       LEFT JOIN accounts a ON CASE 
         WHEN gr.return_type = 'SALE_RETURN' THEN ge.purchaser_id
         WHEN gr.return_type = 'PURCHASE_RETURN' THEN ge.supplier_id
         ELSE gep.account_id
       END = a.id
       WHERE gep.status = 'PENDING'
       ${userRole === 'TAX' ? 'AND (gep.processed_by_role IS NULL OR gep.processed_by_role = \'TAX\')' : ''}`;

    const gateResult = await pool.query(gateQuery);

    // Get store purchase entries
    const storeResult = await pool.query(
      `SELECT 
        pe.id as pricing_id,
        'STORE_PURCHASE' as entry_type,
        se.grn_number,
        se.vendor_id as account_id,
        pe.quantity,
        pe.status,
        se.unit,
        si.item_name as item_type,
        v.account_name as vendor_name,
        se.vehicle_number,
        se.driver_name,
        se.date_time
       FROM pricing_entries pe
       JOIN store_entries se ON pe.reference_id = se.id
       JOIN store_items si ON se.item_id = si.id
       JOIN accounts v ON se.vendor_id = v.id
       WHERE pe.status = 'PENDING' 
       AND pe.entry_type = 'STORE_PURCHASE'`
    );

    // Add store returns to the query
    const storeReturnsResult = await pool.query(
      `SELECT 
        pe.id as pricing_id,
        'STORE_RETURN' as entry_type,
        sr.return_grn as return_number,
        sr.grn_number as original_grn,
        pe.quantity,
        pe.status,
        pe.unit,
        sr.item_name as item_type,
        sr.date_time,
        sr.remarks as return_reason,
        pe.price_per_unit as original_price
      FROM public.pricing_entries pe
      JOIN public.store_returns sr ON pe.reference_id = sr.id
      WHERE pe.status = 'PENDING'
      AND pe.entry_type = 'STORE_RETURN'`
    ).catch(error => {
      console.error('Store returns query error:', error);
      console.error('Query:', `SELECT 
        pe.id as pricing_id,
        'STORE_RETURN' as entry_type,
        sr.return_grn as return_number,
        sr.grn_number as original_grn,
        pe.quantity,
        pe.status,
        pe.unit,
        sr.item_name as item_type,
        sr.date_time,
        sr.remarks as return_reason,
        pe.price_per_unit as original_price
      FROM public.pricing_entries pe
      JOIN public.store_returns sr ON pe.reference_id = sr.id
      WHERE pe.status = 'PENDING'
      AND pe.entry_type = 'STORE_RETURN'`);
      throw error;
    });

    // Process and combine results
    const processedGateEntries = gateResult.rows.map(row => ({
      ...row,
      quantity: row.return_quantity || row.quantity,
      grn_number: row.return_number || row.grn_number,
      account_name: row.entry_type === 'SALE_RETURN' 
        ? row.purchaser_name 
        : row.entry_type === 'SALE'
          ? row.purchaser_name
          : row.supplier_name,
      date_time: row.return_date || row.date_time,
      unit: row.original_unit || 'KG',
      item_type: row.original_paper_type || row.item_type,
      paper_type: row.original_paper_type
    }));

    const processedStoreEntries = storeResult.rows.map(row => ({
      ...row,
      account_name: row.vendor_name
    }));

    const processedStoreReturns = storeReturnsResult.rows.map(row => ({
      ...row,
      account_name: row.vendor_name,
      display_grn: row.return_number,
      grn_number: row.original_grn,
      date_time: row.date_time
    }));

    // Combine all entries
    const allEntries = [
      ...processedGateEntries,
      ...processedStoreEntries,
      ...processedStoreReturns
    ].sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

    res.json(allEntries);
  } catch (error) {
    console.error('Error fetching pending entries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 