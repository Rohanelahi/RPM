-- Check recent cash_transactions entries
SELECT 
    id,
    type,
    amount,
    reference,
    remarks,
    balance,
    balance_after,
    transaction_date,
    created_at
FROM cash_transactions 
ORDER BY transaction_date DESC, id DESC 
LIMIT 10;

-- Check total cash balance calculation
SELECT 
    COALESCE(
        SUM(CASE 
            WHEN type = 'CREDIT' THEN amount 
            WHEN type = 'DEBIT' THEN -amount 
            ELSE 0 
        END),
        0
    ) as current_cash_balance
FROM cash_transactions;

-- Check payments table for recent entries
SELECT 
    id,
    payment_type,
    account_type,
    amount,
    payment_mode,
    voucher_no,
    payment_date,
    receiver_name,
    remarks
FROM payments 
ORDER BY payment_date DESC, id DESC 
LIMIT 5; 