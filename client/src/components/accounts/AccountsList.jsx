import React, { useState, useEffect } from 'react';
import config from '../../config';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';

const AccountsList = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  
  const [formData, setFormData] = useState({
    accountName: '',
    accountType: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    openingBalance: ''
  });

  const accountTypes = ['SUPPLIER', 'CUSTOMER', 'VENDOR'];

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/accounts/list');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch accounts');
      }
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to fetch accounts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleAdd = () => {
    setEditingAccount(null);
    setFormData({
      accountName: '',
      accountType: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      openingBalance: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      accountName: account.account_name,
      accountType: account.account_type,
      contactPerson: account.contact_person,
      phone: account.phone,
      email: account.email,
      address: account.address,
      openingBalance: account.opening_balance
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.accountName || !formData.accountType) {
        alert('Account Name and Account Type are required');
        return;
      }

      setLoading(true);
      
      const accountData = {
        account_name: formData.accountName.trim(),
        account_type: formData.accountType,
        contact_person: formData.contactPerson?.trim() || null,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        address: formData.address?.trim() || null,
        opening_balance: formData.openingBalance ? parseFloat(formData.openingBalance) : 0,
        current_balance: formData.openingBalance ? parseFloat(formData.openingBalance) : 0
      };

      if (editingAccount) {
        accountData.id = editingAccount.id;
      }

      const response = await fetch(`http://localhost:5000/api/accounts/${editingAccount ? 'update' : 'create'}`, {
        method: editingAccount ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(accountData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save account');
      }
      
      setDialogOpen(false);
      fetchAccounts();
      
      setFormData({
        accountName: '',
        accountType: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        openingBalance: ''
      });
      setEditingAccount(null);
      
    } catch (error) {
      console.error('Error saving account:', error);
      alert(error.message || 'Error saving account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Account
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ width: '100%', overflow: 'auto' }}>
        <Table sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              <TableCell width="20%">Account Name</TableCell>
              <TableCell width="15%">Type</TableCell>
              <TableCell width="20%">Contact Person</TableCell>
              <TableCell width="15%">Phone</TableCell>
              <TableCell width="20%">Current Balance</TableCell>
              <TableCell width="10%">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.account_name}</TableCell>
                <TableCell>{account.account_type}</TableCell>
                <TableCell>{account.contact_person}</TableCell>
                <TableCell>{account.phone}</TableCell>
                <TableCell>{account.current_balance}</TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEdit(account)}
                  >
                    Edit
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
          {editingAccount ? 'Edit Account' : 'Add Account'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              required
              fullWidth
              label="Account Name"
              value={formData.accountName}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                accountName: e.target.value
              }))}
              error={!formData.accountName}
              helperText={!formData.accountName ? "Account Name is required" : ""}
              sx={{ mb: 2 }}
            />

            <TextField
              required
              select
              fullWidth
              label="Account Type"
              value={formData.accountType}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                accountType: e.target.value
              }))}
              error={!formData.accountType}
              helperText={!formData.accountType ? "Account Type is required" : ""}
              sx={{ mb: 2 }}
            >
              {accountTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                contactPerson: e.target.value
              }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                phone: e.target.value
              }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                email: e.target.value
              }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Address"
              multiline
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                address: e.target.value
              }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Opening Balance"
              type="number"
              value={formData.openingBalance}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                openingBalance: e.target.value
              }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !formData.accountName || !formData.accountType}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountsList; 