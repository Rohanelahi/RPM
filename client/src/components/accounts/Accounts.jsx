import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Print, Search } from '@mui/icons-material';
import PendingEntries from './PendingEntries';
import AccountsList from './AccountsList';
import Ledger from './Ledger';
import '../../styles/accounts/AccountsPage.css';
import api from '../../services/api';
import PropTypes from 'prop-types';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`accounts-tabpanel-${index}`}
      aria-labelledby={`accounts-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const GRNDetails = () => {
  const [grnNumber, setGrnNumber] = useState('');
  const [grnData, setGrnData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);

  const handleSearch = async () => {
    if (!grnNumber.trim()) {
      setError('Please enter a GRN number');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await api.getGRNDetails(grnNumber);
      console.log('Received GRN data:', data);
      if (data) {
        setGrnData(data);
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to fetch GRN details');
      setGrnData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditedData({ ...grnData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedData(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const updatedData = await api.updateGRNDetails(grnNumber, {
        cut_weight: editedData.cut_weight,
        price_per_unit: editedData.price_per_unit,
        final_quantity: editedData.final_quantity,
        total_amount: editedData.total_amount
      });
      setGrnData({ ...grnData, ...updatedData });
      setIsEditing(false);
      setEditedData(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (event) => {
    const newValue = parseFloat(event.target.value) || 0;
    const updatedData = { ...editedData };
    
    switch (field) {
      case 'cut_weight':
        updatedData.cut_weight = newValue;
        // Update final quantity: original quantity - cut weight
        updatedData.final_quantity = (grnData.quantity || 0) - newValue;
        // Update total amount based on new final quantity
        updatedData.total_amount = updatedData.final_quantity * (updatedData.price_per_unit || 0);
        break;

      case 'price_per_unit':
        updatedData.price_per_unit = newValue;
        // Update total amount based on new price
        updatedData.total_amount = (updatedData.final_quantity || 0) * newValue;
        break;

      case 'final_quantity':
        updatedData.final_quantity = newValue;
        // Update cut weight based on new final quantity
        updatedData.cut_weight = (grnData.quantity || 0) - newValue;
        // Update total amount based on new final quantity
        updatedData.total_amount = newValue * (updatedData.price_per_unit || 0);
        break;

      case 'total_amount':
        updatedData.total_amount = newValue;
        // Update price per unit based on new total amount
        if (updatedData.final_quantity > 0) {
          updatedData.price_per_unit = newValue / updatedData.final_quantity;
        }
        break;

      default:
        updatedData[field] = newValue;
    }

    // Round all numbers to 2 decimal places
    Object.keys(updatedData).forEach(key => {
      if (typeof updatedData[key] === 'number') {
        updatedData[key] = Math.round(updatedData[key] * 100) / 100;
      }
    });

    setEditedData(updatedData);
  };

  console.log('Current grnData:', grnData);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>GRN Details - ${grnNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; width: 200px; }
            .header { text-align: center; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; }
            .grn-number { font-size: 18px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Rose Paper Mill PVT</div>
            <div class="grn-number">GRN Number: ${grnNumber}</div>
          </div>
          ${grnData ? `
            <table>
              <tr>
                <th>Date</th>
                <td>${new Date(grnData.date_time).toLocaleDateString()}</td>
              </tr>
              <tr>
                <th>Entry Type</th>
                <td>${grnData.entry_type}</td>
              </tr>
              <tr>
                <th>Supplier/Purchaser</th>
                <td>${grnData.supplier_name}</td>
              </tr>
              <tr>
                <th>Vehicle Number</th>
                <td>${grnData.vehicle_number}</td>
              </tr>
              <tr>
                <th>Vehicle Type</th>
                <td>${grnData.vehicle_type}</td>
              </tr>
              <tr>
                <th>Driver Name</th>
                <td>${grnData.driver_name}</td>
              </tr>
              <tr>
                <th>Item Type</th>
                <td>${grnData.item_type}</td>
              </tr>
              <tr>
                <th>Net Quantity</th>
                <td>${grnData.final_quantity || grnData.quantity} ${grnData.unit}</td>
              </tr>
              <tr>
                <th>Cut Weight</th>
                <td>${grnData.cut_weight ? `${grnData.cut_weight} ${grnData.unit}` : `0 ${grnData.unit}`}</td>
              </tr>
              ${grnData.price_per_unit ? `
                <tr>
                  <th>Price per Unit</th>
                  <td>Rs. ${grnData.price_per_unit}</td>
                </tr>
                <tr>
                  <th>Total Amount</th>
                  <td>Rs. ${grnData.total_amount}</td>
                </tr>
              ` : ''}
              ${grnData.remarks ? `
                <tr>
                  <th>Remarks</th>
                  <td>${grnData.remarks}</td>
                </tr>
              ` : ''}
            </table>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          label="Enter GRN Number"
          value={grnNumber}
          onChange={(e) => setGrnNumber(e.target.value)}
          size="small"
          error={!!error}
          helperText={error}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          startIcon={<Search />}
          disabled={loading}
        >
          Search
        </Button>
        {grnData && (
          <Button
            variant="outlined"
            onClick={handlePrint}
            startIcon={<Print />}
          >
            Print
          </Button>
        )}
      </Box>

      {loading && <CircularProgress />}

      {grnData && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {!isEditing ? (
              <Button
                variant="contained"
                onClick={handleEdit}
                color="primary"
              >
                Edit Details
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  color="primary"
                >
                  Save Changes
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              </>
            )}
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold', width: '200px' }}>Date</TableCell>
                  <TableCell>{new Date(grnData.date_time).toLocaleDateString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>GRN Number</TableCell>
                  <TableCell>{grnData.grn_number}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Entry Type</TableCell>
                  <TableCell>{grnData.entry_type}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Supplier/Purchaser</TableCell>
                  <TableCell>{grnData.supplier_name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Vehicle Number</TableCell>
                  <TableCell>{grnData.vehicle_number}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Vehicle Type</TableCell>
                  <TableCell>{grnData.vehicle_type}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Driver Name</TableCell>
                  <TableCell>{grnData.driver_name}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Item Type</TableCell>
                  <TableCell>{grnData.item_type}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Original Quantity</TableCell>
                  <TableCell>{grnData.quantity} {grnData.unit}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Cut Weight</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        value={editedData.cut_weight || ''}
                        onChange={handleInputChange('cut_weight')}
                        type="number"
                        size="small"
                        InputProps={{
                          endAdornment: <span>{grnData.unit}</span>
                        }}
                      />
                    ) : (
                      `${grnData.cut_weight || 0} ${grnData.unit}`
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Final Quantity</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        value={editedData.final_quantity || ''}
                        onChange={handleInputChange('final_quantity')}
                        type="number"
                        size="small"
                        InputProps={{
                          endAdornment: <span>{grnData.unit}</span>
                        }}
                      />
                    ) : (
                      `${grnData.final_quantity || grnData.quantity} ${grnData.unit}`
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Price per Unit</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        value={editedData.price_per_unit || ''}
                        onChange={handleInputChange('price_per_unit')}
                        type="number"
                        size="small"
                        InputProps={{
                          startAdornment: <span>Rs.</span>
                        }}
                      />
                    ) : (
                      `Rs. ${grnData.price_per_unit || 0}`
                    )}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" sx={{ fontWeight: 'bold' }}>Total Amount</TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        value={editedData.total_amount || ''}
                        onChange={handleInputChange('total_amount')}
                        type="number"
                        size="small"
                        InputProps={{
                          startAdornment: <span>Rs.</span>
                        }}
                      />
                    ) : (
                      `Rs. ${grnData.total_amount || 0}`
                    )}
                  </TableCell>
                </TableRow>
                {grnData.remarks && (
                  <TableRow>
                    <TableCell component="th" sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                    <TableCell>{grnData.remarks}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

const Accounts = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <div className="accounts-page">
      <Paper className="content-paper">
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={value} 
              onChange={handleChange}
              aria-label="accounts tabs"
              sx={{
                '& .MuiTabs-indicator': {
                  backgroundColor: 'primary.main',
                }
              }}
            >
              <Tab 
                label="Pending Entries" 
                sx={{ 
                  fontWeight: 600,
                  '&.Mui-selected': {
                    color: 'primary.main',
                  }
                }}
              />
              <Tab 
                label="Accounts List"
                sx={{ 
                  fontWeight: 600,
                  '&.Mui-selected': {
                    color: 'primary.main',
                  }
                }}
              />
              <Tab 
                label="Ledger"
                sx={{ 
                  fontWeight: 600,
                  '&.Mui-selected': {
                    color: 'primary.main',
                  }
                }}
              />
              <Tab 
                label="GRN Search"
                sx={{ 
                  fontWeight: 600,
                  '&.Mui-selected': {
                    color: 'primary.main',
                  }
                }}
              />
            </Tabs>
          </Box>

          <TabPanel value={value} index={0}>
            <PendingEntries />
          </TabPanel>

          <TabPanel value={value} index={1}>
            <AccountsList />
          </TabPanel>

          <TabPanel value={value} index={2}>
            <Ledger />
          </TabPanel>

          <TabPanel value={value} index={3}>
            <GRNDetails />
          </TabPanel>
        </Box>
      </Paper>
    </div>
  );
};

Accounts.propTypes = {
  children: PropTypes.node.isRequired,
  value: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired
};

export default Accounts; 