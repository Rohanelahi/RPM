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

const GatePassView = ({ gatePass }) => {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Gate Pass - ${gatePass.vehicleNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .company-name { font-size: 24px; font-weight: bold; }
              .gate-pass-title { font-size: 18px; margin: 10px 0; }
              .details { margin: 20px 0; }
              .detail-row { margin: 10px 0; }
              .label { font-weight: bold; }
              .footer { margin-top: 30px; text-align: right; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company-name">Rose Paper Mill PVT</div>
              <div class="gate-pass-title">Gate Pass</div>
            </div>
            <div class="details">
              <div class="detail-row">
                <span class="label">Vehicle Number:</span> ${gatePass.vehicleNumber}
              </div>
              <div class="detail-row">
                <span class="label">Driver Name:</span> ${gatePass.driverName}
              </div>
              <div class="detail-row">
                <span class="label">Purpose:</span> ${gatePass.purpose}
              </div>
              <div class="detail-row">
                <span class="label">Items:</span> ${gatePass.items}
              </div>
              <div class="detail-row">
                <span class="label">Date:</span> ${new Date(gatePass.date).toLocaleDateString()}
              </div>
              ${gatePass.remarks ? `
                <div class="detail-row">
                  <span class="label">Remarks:</span> ${gatePass.remarks}
                </div>
              ` : ''}
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
        <Typography variant="h6">Gate Pass Details</Typography>
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
          <Typography variant="subtitle1">Vehicle Number</Typography>
          <Typography>{gatePass.vehicleNumber}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1">Driver Name</Typography>
          <Typography>{gatePass.driverName}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1">Purpose</Typography>
          <Typography>{gatePass.purpose}</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1">Items</Typography>
          <Typography>{gatePass.items}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="subtitle1">Date</Typography>
          <Typography>{new Date(gatePass.date).toLocaleDateString()}</Typography>
        </Grid>
        {gatePass.remarks && (
          <Grid item xs={12}>
            <Typography variant="subtitle1">Remarks</Typography>
            <Typography>{gatePass.remarks}</Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

GatePassView.propTypes = {
  gatePass: PropTypes.shape({
    id: PropTypes.string.isRequired,
    vehicleNumber: PropTypes.string.isRequired,
    driverName: PropTypes.string.isRequired,
    purpose: PropTypes.string.isRequired,
    items: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    remarks: PropTypes.string
  }).isRequired
};

export default GatePassView; 