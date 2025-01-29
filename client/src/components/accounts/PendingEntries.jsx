import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  CircularProgress,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import { Refresh } from '@mui/icons-material';

const PendingEntries = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    accountId: '',
    pricePerUnit: '',
    cutWeight: '0',
  });
  const [refreshing, setRefreshing] = useState(false);

  // Fetch pending entries
  useEffect(() => {
    fetchPendingEntries();
    fetchAccounts();
  }, []);

  const fetchPendingEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/accounts/pending-entries');
      if (!response.ok) throw new Error('Failed to fetch entries');
      const data = await response.json();
      
      console.log('Raw pending entries:', data); // Debug log
      
      const processedEntries = data
        .filter(entry => 
          entry.status === 'PENDING' && 
          entry.pricing_id && 
          (entry.grn_number || entry.return_number || entry.entry_type === 'STORE_PURCHASE')
        )
        .map(entry => {
          console.log('Processing entry before transform:', entry); // Debug log
          
          // Use return_number for return entries, grn_number for others
          const displayGrn = entry.entry_type.includes('RETURN') 
            ? entry.return_number  // Use return_number directly for return entries
            : entry.grn_number;    // Use grn_number for other entries
          
          const processedEntry = {
            ...entry,
            display_grn: displayGrn,
            account_name: entry.account_name || entry.supplier_name || entry.purchaser_name || entry.vendor_name,
            item_type: entry.item_name || entry.item_type || entry.paper_type,
            account_type_label: getAccountTypeLabel(entry.entry_type),
            quantity: entry.return_quantity || entry.quantity,
            unit: entry.unit || entry.original_unit
          };
          
          console.log('Processing entry after transform:', processedEntry); // Debug log
          return processedEntry;
        });
      
      console.log('Final processed entries:', processedEntries); // Debug log
      setEntries(processedEntries);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch pending entries');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/accounts/list');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Handle refresh button click
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPendingEntries();
    setRefreshing(false);
  };

  const handleProcess = (entry) => {
    // Additional validation before processing
    if (!entry.pricing_id || !entry.quantity || !entry.account_id) {
      alert('Invalid entry data. Cannot process this entry.');
      return;
    }
    
    setSelectedEntry(entry);
    setFormData({
      pricePerUnit: '',
      cutWeight: '0',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.pricePerUnit || formData.pricePerUnit <= 0) {
        alert('Please enter a valid price per unit');
        return;
      }

      if (!selectedEntry?.pricing_id) {
        alert('Invalid entry selected');
        return;
      }

      setLoading(true);
      const endpoint = selectedEntry.entry_type === 'STORE_PURCHASE'
        ? '/api/accounts/process-store-purchase'
        : selectedEntry.entry_type === 'STORE_RETURN'
          ? '/api/accounts/process-store-return'
          : selectedEntry.entry_type === 'SALE_RETURN'
            ? '/api/accounts/process-return'
            : selectedEntry.entry_type === 'PURCHASE_RETURN'
              ? '/api/accounts/process-return'
              : '/api/accounts/process-entry';

      const finalQuantity = selectedEntry.quantity - (selectedEntry?.entry_type === 'PURCHASE' ? parseFloat(formData.cutWeight) || 0 : 0);
      const totalAmount = parseFloat(formData.pricePerUnit) * finalQuantity;

      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId: selectedEntry.pricing_id,
          pricePerUnit: parseFloat(formData.pricePerUnit),
          cutWeight: parseFloat(formData.cutWeight) || 0,
          totalAmount: totalAmount,
          finalQuantity: finalQuantity
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process entry');
      }
      
      setDialogOpen(false);
      await fetchPendingEntries();
      alert('Entry processed successfully');
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    // If the date is already in DD/MM/YYYY HH:MI format, return as is
    if (dateString.includes('/')) return dateString;
    
    // Parse the date string and adjust for local timezone
    const date = new Date(dateString);
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    
    return localDate.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  };

  const getEntryTypeDisplay = (entryType) => {
    switch (entryType) {
      case 'STORE_PURCHASE':
        return 'Store Purchase';
      case 'STORE_RETURN':
        return 'Store Return';
      case 'PURCHASE_RETURN':
        return 'Purchase Return';
      case 'SALE_RETURN':
        return 'Sale Return';
      case 'PURCHASE':
        return 'Purchase';
      case 'SALE':
        return 'Sale';
      default:
        return entryType;
    }
  };

  const getEntryTypeColor = (entryType) => {
    switch (entryType) {
      case 'STORE_PURCHASE':
        return 'info.main';  // Blue variant
      case 'STORE_RETURN':
        return 'error.main';  // Red like other returns
      case 'PURCHASE':
        return 'primary.main';
      case 'SALE':
        return 'success.main';
      case 'PURCHASE_RETURN':
        return 'error.main';
      case 'SALE_RETURN':
        return 'warning.main';
      default:
        return 'text.primary';
    }
  };

  const getEntryTypeHoverColor = (entryType) => {
    switch (entryType) {
      case 'STORE_PURCHASE':
        return 'info.dark';
      case 'STORE_RETURN':
        return 'error.dark';
      case 'PURCHASE':
        return 'primary.dark';
      case 'SALE':
        return 'success.dark';
      case 'PURCHASE_RETURN':
        return 'error.dark';
      case 'SALE_RETURN':
        return 'warning.dark';
      default:
        return 'text.primary';
    }
  };

  // Helper function to get account type label
  const getAccountTypeLabel = (entryType) => {
    switch (entryType) {
      case 'STORE_PURCHASE':
      case 'STORE_RETURN':
        return '(Vendor)';
      case 'PURCHASE':
      case 'PURCHASE_RETURN':
        return '(Supplier)';
      case 'SALE':
      case 'SALE_RETURN':
        return '(Customer)';
      default:
        return '';
    }
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2
      }}>
        <Typography variant="h6" component="h2">
          Pending Entries
        </Typography>
        <Tooltip title="Refresh entries">
          <IconButton 
            onClick={handleRefresh}
            disabled={refreshing || loading}
            sx={{ 
              '&:hover': { 
                backgroundColor: 'rgba(0, 0, 0, 0.04)' 
              } 
            }}
          >
            <Refresh 
              sx={{ 
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }} 
            />
          </IconButton>
        </Tooltip>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date & Time</TableCell>
              <TableCell>GRN/Return Number</TableCell>
              <TableCell>Account Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Item Type</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Return Reason</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.pricing_id}>
                <TableCell>{formatDate(entry.return_date || entry.date_time)}</TableCell>
                <TableCell>
                  {entry.display_grn || '-'}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {entry.account_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entry.account_type_label}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      color: getEntryTypeColor(entry.entry_type),
                      fontWeight: 'medium'
                    }}
                  >
                    {getEntryTypeDisplay(entry.entry_type)}
                  </Typography>
                </TableCell>
                <TableCell>{entry.item_type}</TableCell>
                <TableCell>{entry.quantity}</TableCell>
                <TableCell>{entry.unit}</TableCell>
                <TableCell>{entry.return_reason || '-'}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleProcess(entry)}
                    sx={{
                      bgcolor: getEntryTypeColor(entry.entry_type),
                      '&:hover': {
                        bgcolor: getEntryTypeHoverColor(entry.entry_type)
                      }
                    }}
                  >
                    Process
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedEntry?.entry_type === 'SALE' ? 'Process Sale Entry' :
           selectedEntry?.entry_type === 'SALE_RETURN' ? 'Process Sale Return Entry' :
           selectedEntry?.entry_type === 'PURCHASE_RETURN' ? 'Process Purchase Return Entry' :
           selectedEntry?.entry_type === 'STORE_RETURN' ? 'Process Store Return Entry' :
           selectedEntry?.entry_type === 'STORE_PURCHASE' ? 'Process Store Purchase Entry' :
           'Process Purchase Entry'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              type="number"
              label="Price per Unit"
              required
              value={formData.pricePerUnit}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pricePerUnit: e.target.value
              }))}
              sx={{ mb: 2 }}
            />
            {selectedEntry?.entry_type === 'PURCHASE' && (
              <TextField
                fullWidth
                type="number"
                label="Cut Weight"
                value={formData.cutWeight}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  cutWeight: e.target.value
                }))}
                sx={{ mb: 2 }}
              />
            )}
            {formData.pricePerUnit && selectedEntry && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Original Quantity: {selectedEntry.quantity} {selectedEntry.unit}
                </Typography>
                {selectedEntry?.entry_type === 'PURCHASE' && (
                  <Typography variant="body2" color="text.secondary">
                    Cut Weight: {formData.cutWeight} {selectedEntry.unit}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Final Quantity: {selectedEntry.quantity - (selectedEntry?.entry_type === 'PURCHASE' ? parseFloat(formData.cutWeight) || 0 : 0)} {selectedEntry.unit}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Amount: Rs. {((parseFloat(formData.pricePerUnit) || 0) * (selectedEntry.quantity - (selectedEntry?.entry_type === 'PURCHASE' ? parseFloat(formData.cutWeight) || 0 : 0))).toFixed(2)}
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.pricePerUnit}
            sx={{
              bgcolor: getEntryTypeColor(selectedEntry?.entry_type),
              '&:hover': {
                bgcolor: getEntryTypeHoverColor(selectedEntry?.entry_type)
              }
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingEntries; 