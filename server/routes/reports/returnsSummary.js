const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Get returns summary data
router.get('/returns-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Validate date parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    // Query to get purchase returns
    const purchaseReturnsQuery = `
      SELECT 
        gr.date_time as return_date, 
        gr.return_number, 
        gr.original_grn_number,
        gr.return_quantity,
        gr.return_reason,
        gr.vehicle_number,
        gr.driver_name,
        g.item_type,
        a.account_name as supplier_name,
        g.unit,
        COALESCE(gep.price_per_unit, 0) as price_per_unit,
        COALESCE(gep.price_per_unit * gr.return_quantity, 0) as total_amount,
        gep.status as pricing_status
      FROM gate_returns gr
      JOIN gate_entries g ON gr.original_grn_number = g.grn_number
      JOIN accounts a ON g.supplier_id = a.id
      LEFT JOIN gate_entries_pricing gep ON gr.return_number = gep.grn_number
      WHERE gr.return_type = 'PURCHASE_RETURN'
      AND gr.date_time BETWEEN $1 AND $2
      ORDER BY gr.date_time DESC
    `;
    
    // Query to get sale returns
    const saleReturnsQuery = `
      SELECT 
        gr.date_time as return_date, 
        gr.return_number, 
        gr.original_grn_number,
        gr.return_quantity,
        gr.return_reason,
        gr.vehicle_number,
        gr.driver_name,
        g.paper_type as item_type,
        a.account_name as customer_name,
        g.unit,
        COALESCE(gep.price_per_unit, 0) as price_per_unit,
        COALESCE(gep.price_per_unit * gr.return_quantity, 0) as total_amount,
        gep.status as pricing_status
      FROM gate_returns gr
      JOIN gate_entries g ON gr.original_grn_number = g.grn_number
      JOIN accounts a ON g.purchaser_id = a.id
      LEFT JOIN gate_entries_pricing gep ON gr.return_number = gep.grn_number
      WHERE gr.return_type = 'SALE_RETURN'
      AND gr.date_time BETWEEN $1 AND $2
      ORDER BY gr.date_time DESC
    `;
    
    // Query to get store returns - FIXED column names
    const storeReturnsQuery = `
      SELECT 
        sr.date_time as return_date, 
        sr.return_grn as return_number, 
        sr.grn_number as original_grn_number,
        sr.quantity as return_quantity,
        sr.remarks,
        se.vehicle_number,
        se.driver_name,
        si.item_name as item_type,
        a.account_name as vendor_name,
        si.unit,
        COALESCE(pe.price_per_unit, 0) as price_per_unit,
        COALESCE(pe.price_per_unit * sr.quantity, 0) as total_amount,
        pe.status as pricing_status
      FROM store_returns sr
      JOIN store_entries se ON sr.grn_number = se.grn_number
      JOIN store_items si ON se.item_id = si.id
      JOIN accounts a ON se.vendor_id = a.id
      LEFT JOIN pricing_entries pe ON sr.id = pe.reference_id AND pe.entry_type = 'STORE_RETURN'
      WHERE sr.date_time BETWEEN $1 AND $2
      ORDER BY sr.date_time DESC
    `;
    
    // Execute all queries in parallel
    const [purchaseReturns, saleReturns, storeReturns] = await Promise.all([
      pool.query(purchaseReturnsQuery, [startDate, endDate]),
      pool.query(saleReturnsQuery, [startDate, endDate]),
      pool.query(storeReturnsQuery, [startDate, endDate])
    ]);
    
    // Calculate totals
    const calculateTotals = (returns) => {
      return returns.reduce((acc, item) => {
        return {
          totalQuantity: acc.totalQuantity + parseFloat(item.return_quantity || 0),
          totalAmount: acc.totalAmount + parseFloat(item.total_amount || 0)
        };
      }, { totalQuantity: 0, totalAmount: 0 });
    };
    
    const purchaseReturnsTotals = calculateTotals(purchaseReturns.rows);
    const saleReturnsTotals = calculateTotals(saleReturns.rows);
    const storeReturnsTotals = calculateTotals(storeReturns.rows);
    
    // Prepare response
    const response = {
      purchaseReturns: {
        data: purchaseReturns.rows,
        totals: purchaseReturnsTotals
      },
      saleReturns: {
        data: saleReturns.rows,
        totals: saleReturnsTotals
      },
      storeReturns: {
        data: storeReturns.rows,
        totals: storeReturnsTotals
      },
      grandTotal: {
        totalQuantity: purchaseReturnsTotals.totalQuantity + saleReturnsTotals.totalQuantity + storeReturnsTotals.totalQuantity,
        totalAmount: purchaseReturnsTotals.totalAmount + saleReturnsTotals.totalAmount + storeReturnsTotals.totalAmount
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching returns summary:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

module.exports = router; 