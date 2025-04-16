import { useState, useEffect } from 'react';
import config from '../config';

const useAccounts = (type) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        // Fix: Add proper type parameter and error handling
        const response = await fetch(`http://localhost:5000/api/accounts/list?type=${type.toUpperCase()}`);
        if (!response.ok) throw new Error('Failed to fetch accounts');
        const data = await response.json();
        setAccounts(data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [type]);

  return { accounts, loading, error };
};

export default useAccounts; 