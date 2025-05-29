import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPanel.css';

const AdminPanel = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/user', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.is_admin) {
            setIsAdmin(true);
            fetchTransactions();
          } else {
            setIsAdmin(false);
            setError('Nie masz uprawnień administratora');
            setTimeout(() => navigate('/'), 3000);
          }
        } else {
          throw new Error('Nie udało się pobrać danych użytkownika');
        }
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [navigate]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/transactions', {
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
        throw new Error('Nie udało się pobrać transakcji');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTransactionStatus = async (transactionId, newStatus) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/admin/transactions/${transactionId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Update the transaction in the state
        setTransactions(transactions.map(transaction => 
          transaction.id === transactionId 
            ? { ...transaction, status: newStatus } 
            : transaction
        ));
      } else {
        throw new Error('Nie udało się zaktualizować statusu transakcji');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="admin-panel">
        <div className="loading">Ładowanie danych...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-panel">
        <div className="error-message">Brak dostępu. Przekierowywanie...</div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h1>Panel Administratora</h1>
      <h2>Zarządzanie Płatnościami</h2>
      
      {transactions.length === 0 ? (
        <p>Brak transakcji do wyświetlenia</p>
      ) : (
        <div className="transactions-container">
          <h3>Wszystkie Transakcje</h3>
          <table className="transactions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Użytkownik</th>
                <th>Email</th>
                <th>Kwota</th>
                <th>Metoda Płatności</th>
                <th>Tytuł Przelewu</th>
                <th>Status</th>
                <th>Data</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction.id} className={transaction.payment_method === 'offline' ? 'offline-payment' : ''}>
                  <td>{transaction.id}</td>
                  <td>{transaction.username}</td>
                  <td>{transaction.email}</td>
                  <td>{transaction.amount} zł</td>
                  <td>{transaction.payment_method === 'offline' ? 'Przelew bankowy' : 'Stripe'}</td>
                  <td>{transaction.transfer_title || '-'}</td>
                  <td>
                    <span className={getStatusBadgeClass(transaction.status)}>
                      {getStatusLabel(transaction.status)}
                    </span>
                  </td>
                  <td>{transaction.created_at}</td>
                  <td>
                    {transaction.status === 'pending' && (
                      <div className="action-buttons">
                        <button 
                          className="approve-btn"
                          onClick={() => updateTransactionStatus(transaction.id, 'approved')}
                        >
                          Zatwierdź
                        </button>
                        <button 
                          className="cancel-btn"
                          onClick={() => updateTransactionStatus(transaction.id, 'cancelled')}
                        >
                          Anuluj
                        </button>
                      </div>
                    )}
                    {(transaction.status === 'approved' || transaction.status === 'cancelled') && (
                      <div className="action-buttons">
                        <button 
                          className="reset-btn"
                          onClick={() => updateTransactionStatus(transaction.id, 'pending')}
                        >
                          Resetuj
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
