import { useState, useEffect } from 'react';
import config from '../config';

const useAccounts = (type) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      // Fetch from chart of accounts level3 endpoint with type filter
      const response = await fetch(`${config.apiUrl}/accounts/chart/level3${type ? `?account_type=${type}` : ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      
      // Flatten the hierarchical data into a list of accounts
      const flattenedAccounts = data.reduce((acc, level1) => {
        if (level1.level2_accounts) {
          level1.level2_accounts.forEach(level2 => {
            if (level2.level3_accounts) {
              level2.level3_accounts.forEach(level3 => {
                acc.push({
                  id: level3.id,
                  name: `${level1.name} > ${level2.name} > ${level3.name}`,
                  account_type: level3.account_type,
                  balance_type: level3.balance_type,
                  opening_balance: level3.opening_balance,
                  current_balance: level3.current_balance
                });
              });
            }
          });
        }
        return acc;
      }, []);
      
      setAccounts(flattenedAccounts);
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