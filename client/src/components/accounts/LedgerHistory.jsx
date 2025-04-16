import React, { useState, useEffect } from 'react';
import config from '../../config';

const fetchLedgerHistory = async () => {
  try {
    setLoading(true);
    const response = await fetch(`${config.apiUrl}/accounts/ledger/history?startDate=${startDate}&endDate=${endDate}&account=${selectedAccount}`);
    if (!response.ok) {
      throw new Error('Failed to fetch ledger history');
    }
    const data = await response.json();
    setLedgerHistory(data);
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to fetch ledger history');
  } finally {
    setLoading(false);
  }
}; 