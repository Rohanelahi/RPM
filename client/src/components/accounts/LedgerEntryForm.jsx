import React, { useState, useEffect } from 'react';
import config from '../../config';

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    setLoading(true);
    const response = await fetch(`${config.apiUrl}/accounts/ledger/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: selectedDate,
        account: selectedAccount,
        debit: debitAmount,
        credit: creditAmount,
        description: entryDescription
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to add ledger entry');
    }

    onSuccess();
    onClose();
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to add ledger entry');
  } finally {
    setLoading(false);
  }
}; 