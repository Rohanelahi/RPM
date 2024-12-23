import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import '../../styles/forms/EmployeeDialog.css';

const EmployeeDialog = ({ open, onClose }) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      className="employee-dialog"
    >
      <DialogTitle className="employee-dialog-title">
        Employee Details
      </DialogTitle>
      <DialogContent className="employee-dialog-content">
        {/* Dialog content will be added later */}
      </DialogContent>
      <DialogActions className="employee-dialog-actions">
        <Button 
          variant="outlined"
          onClick={onClose}
          className="action-button"
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          color="primary"
          className="action-button"
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeDialog;
