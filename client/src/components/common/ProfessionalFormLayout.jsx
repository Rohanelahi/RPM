import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { format } from 'date-fns';

const ProfessionalFormLayout = ({ children, title, formType, formId, showReference = true }) => {
  // Generate unique form reference number
  const formReference = `${formType}-${formId}-${format(new Date(), 'yyyyMMdd')}`;

  return (
    <Box className="professional-form">
      {/* Form Header */}
      <Box className="print-header">
        <Typography variant="h4" className="form-title" align="center">
          {title}
        </Typography>
        <Typography variant="subtitle1" className="form-subtitle" align="center">
          {format(new Date(), 'dd MMMM yyyy')}
        </Typography>
      </Box>

      {/* Form Reference - Only show if showReference is true */}
      {showReference && (
        <Box className="form-reference">
          Ref: {formReference}
        </Box>
      )}

      {/* Form Content */}
      {children}

      {/* Form Footer */}
      <Box className="form-footer">
        <Typography variant="caption">
          Page <span className="page-number"></span>
        </Typography>
      </Box>
    </Box>
  );
};

ProfessionalFormLayout.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  formType: PropTypes.string.isRequired,
  formId: PropTypes.string.isRequired,
  showReference: PropTypes.bool
};

ProfessionalFormLayout.defaultProps = {
  showReference: true
};

export default ProfessionalFormLayout; 