import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button
} from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';

const EmployeeView = ({ employee }) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Employee Details - ${employee.name}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .company-name { font-size: 24px; font-weight: bold; }
              .employee-title { font-size: 18px; margin: 10px 0; }
              .details { margin: 20px 0; }
              .detail-row { margin: 10px 0; }
              .label { font-weight: bold; }
              .footer { margin-top: 30px; text-align: right; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">Rose Paper Mill PVT</div>
              <div class="employee-title">Employee Details</div>
            </div>
            <div class="details">
              <div class="detail-row">
                <span class="label">Name:</span> ${employee.name}
              </div>
              <div class="detail-row">
                <span class="label">Designation:</span> ${employee.designation}
              </div>
              <div class="detail-row">
                <span class="label">Department:</span> ${employee.department}
              </div>
              <div class="detail-row">
                <span class="label">Joining Date:</span> ${new Date(employee.joiningDate).toLocaleDateString()}
              </div>
              <div class="detail-row">
                <span class="label">Salary:</span> Rs. ${employee.salary.toLocaleString()}
              </div>
              <div class="detail-row">
                <span class="label">Contact Number:</span> ${employee.contactNumber}
              </div>
              <div class="detail-row">
                <span class="label">Address:</span> ${employee.address}
              </div>
            </div>
            <div class="footer">
              <div>Authorized Signature</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Box component={Paper} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h6">Employee Details</Typography>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print
        </Button>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1">Name</Typography>
          <Typography>{employee.name}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1">Designation</Typography>
          <Typography>{employee.designation}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1">Department</Typography>
          <Typography>{employee.department}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1">Joining Date</Typography>
          <Typography>{new Date(employee.joiningDate).toLocaleDateString()}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1">Salary</Typography>
          <Typography>Rs. {employee.salary.toLocaleString()}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1">Contact Number</Typography>
          <Typography>{employee.contactNumber}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1">Address</Typography>
          <Typography>{employee.address}</Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

EmployeeView.propTypes = {
  employee: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    designation: PropTypes.string.isRequired,
    department: PropTypes.string.isRequired,
    joiningDate: PropTypes.string.isRequired,
    salary: PropTypes.number.isRequired,
    contactNumber: PropTypes.string.isRequired,
    address: PropTypes.string.isRequired
  }).isRequired
};

export default EmployeeView; 