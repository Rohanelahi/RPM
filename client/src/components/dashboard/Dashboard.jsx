import React from 'react';
import { Box, Typography } from '@mui/material';
import '../../styles/Dashboard.css';

const Dashboard = () => {
  return (
    <div className="page-container">
      <Box className="content-paper">
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        {/* Add your dashboard content here */}
      </Box>
    </div>
  );
};

export default Dashboard; 