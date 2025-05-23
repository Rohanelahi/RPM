import { useState, useEffect } from 'react';
import config from '../config';

const useAccounts = (type) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/accounts/list${type ? `?type=${type}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      setAccounts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [type]);

  return { accounts, loading, error, fetchAccounts };
};

export default useAccounts; 