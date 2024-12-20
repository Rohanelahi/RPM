import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

const EmployeeDialog = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Employee Details</DialogTitle>
      <DialogContent>
        {/* Dialog content will be added later */}
      </DialogContent>
      <DialogActions>
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
