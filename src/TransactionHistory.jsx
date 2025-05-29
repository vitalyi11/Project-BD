import React, { useState, useEffect } from 'react';
import './TransactionHistory.css';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/transactions', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setTransactions(data.transactions);
        } else {
          throw new Error('Nie udało się pobrać historii transakcji');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Oczekująca';
      case 'approved':
        return 'Zatwierdzona';
      case 'cancelled':
        return 'Anulowana';
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-badge pending';
      case 'approved':
        return 'status-badge approved';
      case 'cancelled':
        return 'status-badge cancelled';
      default:
        return 'status-badge';
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'offline':
        return 'Przelew bankowy';
      case 'stripe':
        return 'Karta płatnicza (Stripe)';
      default:
        return method;
    }
  };

  if (loading) {
    return <div className="loading">Ładowanie historii transakcji...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="transaction-history">
      <h2>Historia Transakcji</h2>
      
      {transactions.length === 0 ? (
        <p className="no-transactions">Nie masz jeszcze żadnych transakcji</p>
      ) : (
        <div className="transactions-list">
          {transactions.map(transaction => (
            <div key={transaction.id} className="transaction-card">
              <div className="transaction-header">
                <div className="transaction-id">Zamówienie #{transaction.id}</div>
                <div className={getStatusBadgeClass(transaction.status)}>
                  {getStatusLabel(transaction.status)}
                </div>
              </div>
              
              <div className="transaction-details">
                <div className="transaction-info">
                  <p><strong>Data:</strong> {transaction.created_at}</p>
                  <p><strong>Metoda płatności:</strong> {getPaymentMethodLabel(transaction.payment_method)}</p>
                  <p><strong>Kwota:</strong> {transaction.amount} zł</p>
                  {transaction.payment_method === 'offline' && (
                    <p><strong>Tytuł przelewu:</strong> {transaction.transfer_title}</p>
                  )}
                </div>
                
                <div className="transaction-items">
                  <h4>Produkty:</h4>
                  <ul>
                    {transaction.items.map(item => (
                      <li key={item.id}>
                        {item.product_name} - {item.product_price} zł x {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              {transaction.payment_method === 'offline' && transaction.status === 'pending' && (
                <div className="transaction-instructions">
                  <h4>Instrukcje płatności:</h4>
                  <p>Aby dokończyć zamówienie, wykonaj przelew na poniższe dane:</p>
                  <div className="bank-details">
                    <p><strong>Numer konta:</strong> PL 12 3456 7890 1234 5678 9012 3456</p>
                    <p><strong>Bank:</strong> Example Bank</p>
                    <p><strong>Odbiorca:</strong> Gamer Shop Sp. z o.o.</p>
                    <p><strong>Kwota:</strong> {transaction.amount} zł</p>
                    <p><strong>Tytuł przelewu:</strong> {transaction.transfer_title}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
