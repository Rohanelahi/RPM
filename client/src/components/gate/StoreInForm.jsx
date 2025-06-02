import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Stack,
  MenuItem,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import '../../styles/forms/GateForm.css';
import { format } from 'date-fns';
import config from '../../config';
import useAccounts from '../../hooks/useAccounts';

const StoreInForm = () => {
  const [loading, setLoading] = useState(false);
  const { accounts: vendors, loading: vendorsLoading } = useAccounts('VENDOR');
  const [storeItems, setStoreItems] = useState([]);
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  const [isPrinted, setIsPrinted] = useState(false);
  
  const [selectedItems, setSelectedItems] = useState([]);
  
  const [formData, setFormData] = useState({
    grnNumber: '',
    vendorId: '',
    vehicleNumber: '',
    driverName: '',
    dateTime: new Date(),
    remarks: ''
  });

  const [newItemData, setNewItemData] = useState({
    itemName: ''
  });

  const units = [
    'KG',
    'Piece',
    'Meter',
    'Litre',
    'Set',
    'Box',
    'Pack'
  ];

  const categories = [
    'Lubricants',
    'Vehicle Parts',
    'Filters',
    'Tools',
    'Consumables',
    'Others'
  ];

  // Generate GRN number
  useEffect(() => {
    const generateGRN = () => {
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      return `STI-${year}${month}${day}-${random}`;
    };

    setFormData(prev => ({
      ...prev,
      grnNumber: generateGRN()
    }));
  }, []);

  // Fetch store items
  const fetchStoreItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/store/items`);
      if (!response.ok) throw new Error('Failed to fetch items');
      const data = await response.json();
      setStoreItems(data);
    } catch (error) {
      console.error('Error fetching store items:', error);
      alert('Failed to fetch store items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreItems();
  }, []);

  const handleAddItem = () => {
    const selectedItem = storeItems.find(item => item.id === formData.itemId);
    if (selectedItem && formData.quantity && formData.unit) {
      setSelectedItems(prev => [...prev, {
        itemId: selectedItem.id,
        itemName: selectedItem.item_name,
        itemCode: selectedItem.item_code,
        quantity: formData.quantity,
        unit: formData.unit
      }]);
      
      // Clear item selection fields
      setFormData(prev => ({
        ...prev,
        itemId: '',
        quantity: '',
        unit: ''
      }));
    }
  };

  const handleRemoveItem = (index) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const response = await fetch(`${config.apiUrl}/store/in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: selectedItems.map(item => ({
            itemId: item.itemId,
            quantity: Number(item.quantity),
            unit: item.unit
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong');
      }

      // Generate new GRN number
      const generateGRN = () => {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `STI-${year}${month}${day}-${random}`;
      };

      // Reset form with new GRN
      setFormData({
        grnNumber: generateGRN(),
        vendorId: '',
        vehicleNumber: '',
        driverName: '',
        dateTime: new Date(),
        remarks: '',
        itemId: '',
        quantity: '',
        unit: ''
      });
      
      // Clear selected items
      setSelectedItems([]);
      
      // Reset print status
      setIsPrinted(false);

      // Refresh store items list
      await fetchStoreItems();

      alert('Store in entries created successfully');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const currentDate = format(new Date(), 'dd/MM/yyyy');
    const currentTime = format(new Date(), 'HH:mm:ss');
    const selectedVendor = vendors.find(v => v.id === formData.vendorId);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Store In Gate Pass</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              margin: 2cm;
              font-family: Arial, sans-serif;
              color: #000;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 1cm;
            }
            .company-name {
              font-size: 24pt;
              font-weight: bold;
              margin-bottom: 0.5cm;
            }
            .document-title {
              font-size: 16pt;
              text-transform: uppercase;
              margin-bottom: 1cm;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 1cm;
            }
            th, td {
              border: 1px solid #000;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f0f0f0;
            }
            .items-table th {
              text-align: center;
            }
            .items-table td {
              text-align: center;
            }
            .signatures {
              margin-top: 2cm;
            }
            .signature-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1cm;
            }
            .signature-box {
              text-align: center;
            }
            .signature-line {
              margin-top: 1cm;
              border-top: 1px solid #000;
              padding-top: 0.5cm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Rose Paper Mill</div>
            <div class="document-title">Store In Gate Pass</div>
          </div>

          <table>
            <tr>
              <th colspan="2">Basic Information</th>
            </tr>
            <tr>
              <td><strong>GRN Number:</strong></td>
              <td>${formData.grnNumber}</td>
            </tr>
            <tr>
              <td><strong>Date:</strong></td>
              <td>${currentDate}</td>
            </tr>
            <tr>
              <td><strong>Time:</strong></td>
              <td>${currentTime}</td>
            </tr>
            <tr>
              <td><strong>Vendor:</strong></td>
              <td>${selectedVendor?.name || 'N/A'}</td>
            </tr>
          </table>

          <table>
            <tr>
              <th colspan="2">Vehicle Information</th>
            </tr>
            <tr>
              <td><strong>Vehicle Number:</strong></td>
              <td>${formData.vehicleNumber}</td>
            </tr>
            <tr>
              <td><strong>Driver Name:</strong></td>
              <td>${formData.driverName || 'N/A'}</td>
            </tr>
          </table>

          <table class="items-table">
            <tr>
              <th colspan="4">Item Details</th>
            </tr>
            <tr>
              <th>Sr. No.</th>
              <th>Item Name</th>
              <th>Quantity</th>
              <th>Unit</th>
            </tr>
            ${selectedItems.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.itemName}</td>
                <td>${item.quantity}</td>
                <td>${item.unit}</td>
              </tr>
            `).join('')}
          </table>

          ${formData.remarks ? `
          <table>
            <tr>
              <th colspan="2">Additional Information</th>
            </tr>
            <tr>
              <td><strong>Remarks:</strong></td>
              <td>${formData.remarks}</td>
            </tr>
          </table>
          ` : ''}

          <div class="signatures">
            <div class="signature-grid">
              <div class="signature-box">
                <div class="signature-line">Gate Officer</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Vendor</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">Store Manager</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
      setIsPrinted(true);
    }, 250);
  };

  const handleAddNewItem = async () => {
    try {
      setLoading(true);
      
      if (!newItemData.itemName) {
        alert('Item name is required');
        return;
      }

      // Generate item code from name (first letters of each word + random number)
      const itemCode = newItemData.itemName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase() + 
        Math.floor(Math.random() * 1000).toString().padStart(3, '0');

      const response = await fetch(`${config.apiUrl}/store/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_name: newItemData.itemName,
          item_code: itemCode,
          category: 'Others',  // Default category
          unit: 'Piece'       // Default unit
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add item');
      }

      const newItem = await response.json();
      
      // Refresh items list
      await fetchStoreItems();
      
      // Set the newly created item as selected
      setFormData(prev => ({
        ...prev,
        itemId: newItem.id,
        itemName: newItem.item_name,
        itemCode: newItem.item_code,
        unit: newItem.unit
      }));
      
      // Reset form and close dialog
      setNewItemData({ itemName: '' });
      setNewItemDialogOpen(false);
      
    } catch (error) {
      console.error('Error adding new item:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event, nextFieldId) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const nextField = document.getElementById(nextFieldId);
      if (nextField) {
        nextField.focus();
      }
    }
  };

  const handleItemChange = (e) => {
    const value = e.target.value;
    if (value === 'add_new') {
      setNewItemDialogOpen(true);
      return;
    }

    const selectedItem = storeItems.find(item => item.id === value);
    setFormData(prev => ({
      ...prev,
      itemId: value,
      unit: selectedItem?.unit || '',
      itemName: selectedItem?.item_name || '',
      itemCode: selectedItem?.item_code || ''
    }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="gate-form">
        <Paper className="content-paper">
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Store In Entry Form
            </Typography>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    id="vendorId"
                    fullWidth
                    select
                    label="Select Vendor"
                    required
                    value={formData.vendorId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vendorId: e.target.value
                    }))}
                    disabled={loading || vendorsLoading}
                    onKeyPress={(e) => handleKeyPress(e, 'vehicleNumber')}
                  >
                    {vendors.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    id="vehicleNumber"
                    fullWidth
                    label="Vehicle Number"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vehicleNumber: e.target.value.toUpperCase()
                    }))}
                    onKeyPress={(e) => handleKeyPress(e, 'driverName')}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    id="driverName"
                    fullWidth
                    label="Driver Name"
                    value={formData.driverName}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      driverName: e.target.value
                    }))}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          id="itemId"
                          fullWidth
                          select
                          label="Select Item"
                          value={formData.itemId}
                          onChange={handleItemChange}
                          disabled={loading}
                        >
                          <MenuItem value="add_new" sx={{ 
                            color: 'primary.main',
                            fontWeight: 'bold'
                          }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <AddIcon />
                              <span>Add New Item</span>
                            </Stack>
                          </MenuItem>
                          <Divider />
                          {storeItems.map((item) => (
                            <MenuItem key={item.id} value={item.id}>
                              {item.item_name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Quantity"
                          value={formData.quantity}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            quantity: e.target.value
                          }))}
                        />
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          select
                          label="Unit"
                          value={formData.unit}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            unit: e.target.value
                          }))}
                        >
                          {units.map((unit) => (
                            <MenuItem key={unit} value={unit}>
                              {unit}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={handleAddItem}
                          disabled={!formData.itemId || !formData.quantity || !formData.unit}
                          sx={{ height: '100%' }}
                        >
                          Add Item
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>

                  {selectedItems.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2 }}>
                        Selected Items
                      </Typography>
                      <Grid container spacing={2}>
                        {selectedItems.map((item, index) => (
                          <Grid item xs={12} key={index}>
                            <Paper variant="outlined" sx={{ p: 1 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography>
                                  {item.itemName} - {item.quantity} {item.unit}
                                </Typography>
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleRemoveItem(index)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Stack>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    id="remarks"
                    fullWidth
                    label="Remarks"
                    multiline
                    rows={3}
                    value={formData.remarks}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      remarks: e.target.value
                    }))}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      startIcon={<Print />}
                      onClick={handlePrint}
                      disabled={selectedItems.length === 0}
                    >
                      Print
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || !isPrinted || selectedItems.length === 0}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Submit'}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </form>
          </Box>
        </Paper>
      </div>

      <Dialog 
        open={newItemDialogOpen} 
        onClose={() => setNewItemDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Item</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Item Name"
              required
              value={newItemData.itemName}
              onChange={(e) => setNewItemData(prev => ({
                ...prev,
                itemName: e.target.value
              }))}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newItemData.itemName) {
                  e.preventDefault();
                  handleAddNewItem();
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewItemDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddNewItem}
            variant="contained"
            disabled={loading || !newItemData.itemName}
          >
            {loading ? <CircularProgress size={24} /> : 'Add Item'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default StoreInForm; 