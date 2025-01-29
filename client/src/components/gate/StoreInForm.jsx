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
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Print, Add as AddIcon } from '@mui/icons-material';
import '../../styles/forms/GateForm.css';

const StoreInForm = () => {
  const [loading, setLoading] = useState(false);
  const [storeItems, setStoreItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [newItemDialogOpen, setNewItemDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    grnNumber: '',
    itemId: '',
    itemName: '',
    itemCode: '',
    quantity: '',
    unit: '',
    vendorId: '',
    vehicleNumber: '',
    driverName: '',
    dateTime: new Date(),
    remarks: '',
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
      const response = await fetch('http://localhost:5000/api/store/items');
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

  // Add useEffect to fetch vendors
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/accounts/list?type=VENDOR');
        if (!response.ok) throw new Error('Failed to fetch vendors');
        const data = await response.json();
        setVendors(data);
      } catch (error) {
        console.error('Error fetching vendors:', error);
      }
    };

    fetchVendors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Find the selected item to include its details
      const selectedItem = storeItems.find(item => item.id === formData.itemId);

      // Format the description similar to purchase/sale entries
      const description = `Store Purchase: ${selectedItem?.item_name} ${formData.quantity} ${formData.unit} @ Rs.${formData.price_per_unit || 0}/unit`;

      const response = await fetch('http://localhost:5000/api/store/in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          item_name: selectedItem?.item_name,
          item_code: selectedItem?.item_code,
          item_unit: selectedItem?.unit,
          description: description  // Add formatted description
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Something went wrong');
      }

      // Reset form after successful submission
      setFormData({
        grnNumber: '',
        itemId: '',
        quantity: '',
        unit: '',
        vendorId: '',
        vehicleNumber: '',
        driverName: '',
        dateTime: new Date(),
        remarks: '',
        itemName: '',
        itemCode: ''
      });

      // Generate new GRN number
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

      alert('Store in entry created successfully');
    } catch (error) {
      console.error('Error submitting form:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

      const response = await fetch('http://localhost:5000/api/store/items', {
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

      // Refresh items list
      await fetchStoreItems();
      
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
                    fullWidth
                    label="GRN Number"
                    value={formData.grnNumber}
                    disabled
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <DateTimePicker
                    label="Date & Time"
                    value={formData.dateTime}
                    onChange={(newValue) => setFormData(prev => ({
                      ...prev,
                      dateTime: newValue
                    }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth
                      select
                      label="Item"
                      required
                      value={formData.itemId}
                      onChange={(e) => {
                        const selectedItem = storeItems.find(item => item.id === e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          itemId: e.target.value,
                          unit: selectedItem?.unit || '',
                          itemName: selectedItem?.item_name || '',
                          itemCode: selectedItem?.item_code || ''
                        }));
                      }}
                    >
                      {storeItems.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {`${item.item_name} (${item.item_code})`}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button
                      variant="contained"
                      onClick={() => setNewItemDialogOpen(true)}
                      sx={{ minWidth: 'auto', px: 2 }}
                    >
                      <AddIcon />
                    </Button>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Quantity"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      quantity: e.target.value
                    }))}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    select
                    label="Unit"
                    required
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

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    select
                    label="Vendor"
                    required
                    value={formData.vendorId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vendorId: e.target.value
                    }))}
                  >
                    {vendors.map((vendor) => (
                      <MenuItem key={vendor.id} value={vendor.id}>
                        {vendor.account_name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Vehicle Number"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vehicleNumber: e.target.value.toUpperCase()
                    }))}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
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
                  <TextField
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
                    >
                      Print
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
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

      {/* Simplified Add New Item Dialog */}
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