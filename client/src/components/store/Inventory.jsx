import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  TablePagination,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Search, Print, Refresh as RefreshIcon } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import '../../styles/Inventory.css';
import config from '../../config';

const Inventory = () => {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [issueForm, setIssueForm] = useState({
    department: '',
    issueDate: new Date(),
    items: []
  });

  useEffect(() => {
    fetchInventory();
    fetchDepartments();
  }, []);

  // Add event listener for store returns
  useEffect(() => {
    const handleStoreReturn = () => {
      fetchInventory();
    };

    window.addEventListener('store-return-processed', handleStoreReturn);

    return () => {
      window.removeEventListener('store-return-processed', handleStoreReturn);
    };
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/store/inventory`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/departments`);
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      
      // Remove any duplicates and sort by name
      const uniqueDepartments = Array.from(
        new Map(data.map(item => [item.code, item])).values()
      ).sort((a, b) => a.name.localeCompare(b.name));
      
      setDepartments(uniqueDepartments);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch departments');
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatPrice = (price) => {
    if (!price || isNaN(price)) return '-';
    return `Rs. ${Number(price).toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const handleAddItem = (item) => {
    const existingItem = issueForm.items.find(i => i.itemId === item.id);
    if (existingItem) {
      setIssueForm({
        ...issueForm,
        items: issueForm.items.map(i => 
          i.itemId === item.id ? { ...i } : i
        )
      });
    } else {
      const newItems = [...issueForm.items, { 
        itemId: item.id,
        itemName: item.item_name,
        itemCode: item.item_code,
        unit: item.unit,
        maxQuantity: item.quantity,
        quantity: ''
      }];
      
      setIssueForm({
        ...issueForm,
        items: newItems
      });
    }
  };

  const handleRemoveItem = (itemId) => {
    setIssueForm({
      ...issueForm,
      items: issueForm.items.filter(i => i.itemId !== itemId)
    });
  };

  const handleQuantityChange = (itemId, value) => {
    setIssueForm({
      ...issueForm,
      items: issueForm.items.map(item => 
        item.itemId === itemId ? { ...item, quantity: value } : item
      )
    });
  };

  const handleIssueClick = () => {
    setIssueDialogOpen(true);
  };

  const handleIssueClose = () => {
    setIssueDialogOpen(false);
    setIssueForm({ 
      department: '', 
      issueDate: new Date(),
      items: []
    });
  };

  const handleIssueSubmit = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/store/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          department: issueForm.department,
          issueDate: issueForm.issueDate.toISOString().split('T')[0],
          items: issueForm.items.map(item => ({
            itemCode: item.itemCode,
            quantity: parseInt(item.quantity)
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to issue items');
      }

      const result = await response.json();
      alert(`Items issued successfully. GRN: ${result.grnNumber}`);
      handleIssueClose();
      await fetchInventory();
    } catch (error) {
      console.error('Error issuing items:', error);
      alert(error.message);
    }
  };

  const handlePrintIssue = () => {
    const printContent = `
      <html>
        <head>
          <title>Store Issue Form</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .form-group { margin-bottom: 15px; }
            .form-label { font-weight: bold; }
            table { width: 100%; margin-top: 20px; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .footer { margin-top: 50px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 70px; }
            .signature-line { border-top: 1px solid #000; width: 200px; text-align: center; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Store Issue Form</h2>
          </div>
          
          <div class="form-group">
            <div class="form-label">Date:</div>
            <div>${new Date(issueForm.issueDate).toLocaleDateString()}</div>
          </div>
          
          <div class="form-group">
            <div class="form-label">Department:</div>
            <div>${departments.find(d => d.code === issueForm.department)?.name || ''}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Item Code</th>
                <th>Unit</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${issueForm.items.map(item => `
                <tr>
                  <td>${item.itemName}</td>
                  <td>${item.itemCode}</td>
                  <td>${item.unit}</td>
                  <td>${item.quantity || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signatures">
            <div>
              <div class="signature-line">Issued By</div>
            </div>
            <div>
              <div class="signature-line">Received By</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleRefresh = async () => {
    await fetchInventory();
  };

  return (
    <Box className="inventory-container">
      <Paper elevation={3} className="inventory-paper">
        <Box sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h2">
              Store Inventory
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Refresh'}
            </Button>
          </Box>

          <Box className="inventory-header-actions">
            <TextField
              variant="outlined"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="inventory-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleIssueClick}
              startIcon={<Print />}
              className="issue-button"
            >
              Issue Items
            </Button>
          </Box>

          {loading ? (
            <Box className="inventory-loading">
              <CircularProgress />
            </Box>
          ) : (
            <Box className="inventory-table-container">
              <TableContainer>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow className="inventory-table-header">
                      <TableCell>Item Name</TableCell>
                      <TableCell>Item Code</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Vendor</TableCell>
                      <TableCell align="right">In Stock</TableCell>
                      <TableCell align="right">Last Updated</TableCell>
                      <TableCell align="right">Last Price</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredInventory
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{item.item_code}</TableCell>
                          <TableCell>{item.item_type || '-'}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>{item.vendor_name || '-'}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">
                            {formatDate(item.last_updated)}
                          </TableCell>
                          <TableCell align="right">
                            {formatPrice(item.last_price)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleAddItem(item)}
                              disabled={issueForm.items.some(i => i.itemId === item.id)}
                            >
                              Add to Issue
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                className="inventory-pagination"
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={filteredInventory.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Box>
          )}
        </Box>
      </Paper>

      <Dialog open={issueDialogOpen} onClose={handleIssueClose} maxWidth="md" fullWidth>
        <DialogTitle>Issue Items</DialogTitle>
        <DialogContent>
          <Box className="issue-form">
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Issue Date"
                value={issueForm.issueDate}
                onChange={(newValue) => setIssueForm({ ...issueForm, issueDate: newValue })}
                renderInput={(params) => (
                  <TextField {...params} fullWidth margin="normal" />
                )}
                maxDate={new Date()}
              />
            </LocalizationProvider>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Department</InputLabel>
              <Select
                value={issueForm.department}
                onChange={(e) => setIssueForm({ ...issueForm, department: e.target.value })}
                label="Department"
              >
                {departments.map((dept) => (
                  <MenuItem key={`${dept.id}-${dept.code}`} value={dept.code}>
                    {dept.name} ({dept.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {issueForm.items.length > 0 ? (
              <TableContainer className="issue-items-table">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item Name</TableCell>
                      <TableCell>Code</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {issueForm.items.map((item) => (
                      <TableRow key={item.itemId}>
                        <TableCell>{item.itemName}</TableCell>
                        <TableCell>{item.itemCode}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.itemId, e.target.value)}
                            inputProps={{ 
                              min: 1, 
                              max: item.maxQuantity,
                              style: { width: '80px' }
                            }}
                            size="small"
                            helperText={`Max: ${item.maxQuantity}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemoveItem(item.itemId)}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="textSecondary" sx={{ mt: 2 }}>
                No items added. Add items from the inventory list.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleIssueClose}>Cancel</Button>
          <Button 
            onClick={handlePrintIssue}
            startIcon={<Print />}
            disabled={!issueForm.department || issueForm.items.length === 0}
          >
            Print
          </Button>
          <Button 
            onClick={handleIssueSubmit} 
            variant="contained" 
            disabled={!issueForm.department || !issueForm.items.length}
          >
            Issue Items
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Inventory; 