import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Paper, Autocomplete } from '@mui/material';
import config from '../../config';

const LongVoucher = () => {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    creditAccount: '',
    debitAccount: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    description: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/accounts/chart/all`);
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setAccounts([]);
    }
  };

  const handleAccountChange = (name, value) => {
    if (value) {
      setForm({ ...form, [name]: value });
    } else {
      setForm({ ...form, [name]: null });
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.creditAccount || !form.debitAccount || !form.amount) {
      alert('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${config.apiUrl}/accounts/payments/long-voucher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccount: form.creditAccount.id,
          toAccount: form.debitAccount.id,
          amount: form.amount,
          date: form.date,
          description: form.description
        })
      });
      if (!res.ok) throw new Error('Failed to create voucher');
      alert('Long voucher created successfully!');
      setForm({ 
        creditAccount: null, 
        debitAccount: null, 
        amount: '', 
        date: new Date().toISOString().slice(0, 10), 
        description: '' 
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h6" mb={2}>Long Voucher (Direct Payment)</Typography>
      <form onSubmit={handleSubmit}>
        <Autocomplete
          options={accounts}
          getOptionLabel={(option) => option.displayName || ''}
          value={form.creditAccount}
          onChange={(_, value) => handleAccountChange('creditAccount', value)}
          renderInput={(params) => (
            <TextField {...params} label="Credit Account" required sx={{ mb: 2 }} />
          )}
          isOptionEqualToValue={(option, value) => option.id === value?.id}
        />
        <Autocomplete
          options={accounts}
          getOptionLabel={(option) => option.displayName || ''}
          value={form.debitAccount}
          onChange={(_, value) => handleAccountChange('debitAccount', value)}
          renderInput={(params) => (
            <TextField {...params} label="Debit Account" required sx={{ mb: 2 }} />
          )}
          isOptionEqualToValue={(option, value) => option.id === value?.id}
        />
        <TextField
          label="Amount"
          name="amount"
          type="number"
          value={form.amount}
          onChange={handleChange}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
        <TextField
          label="Date"
          name="date"
          type="date"
          value={form.date}
          onChange={handleChange}
          fullWidth
          required
          sx={{ mb: 2 }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Description (optional)"
          name="description"
          value={form.description}
          onChange={handleChange}
          fullWidth
          multiline
          rows={2}
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>
          {loading ? 'Processing...' : 'Submit'}
        </Button>
      </form>
    </Paper>
  );
};

export default LongVoucher; 