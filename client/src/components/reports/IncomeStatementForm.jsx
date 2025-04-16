import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import PropTypes from 'prop-types';

const IncomeStatementForm = ({ onGenerate }) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerate(formData);
  };

  return (
    <Box component={Paper} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Generate Income Statement
      </Typography>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            type="date"
            label="Start Date"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            type="date"
            label="End Date"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            InputLabelProps={{ shrink: true }}
            required
          />
        </Box>
        <Button type="submit" variant="contained">
          Generate Report
        </Button>
      </form>
    </Box>
  );
};

IncomeStatementForm.propTypes = {
  onGenerate: PropTypes.func.isRequired
};

export default IncomeStatementForm; 