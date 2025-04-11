const express = require('express');
const router = express.Router();
const pool = require('../../db');

// Update account
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      accountName,
      accountType,
      contactPerson,
      phone,
      email,
      address
    } = req.body;

    await client.query(
      `UPDATE accounts 
       SET account_name = $1, account_type = $2,
           contact_person = $3, phone = $4,
           email = $5, address = $6
       WHERE id = $7`,
      [accountName, accountType, contactPerson,
       phone, email, address, id]
    );

    res.json({ message: 'Account updated successfully' });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = router; 