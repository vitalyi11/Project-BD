import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import './Shop.css';
import './OfflinePayment.css';

import podkladka from './podkladka.jpg';
import kubek from './kubek.jpg';
import plakat from './plakat.jpg';

const Shop = () => {
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);  const [orderComplete, setOrderComplete] = useState(false);
  const products = [
    { id: 1, name: 'Podkładka pod myszkę', price: 20, image: podkladka, description: 'Gamingowa podkładka pod myszkę' },
    { id: 2, name: 'Gamingowy Kubek', price: 15, image: kubek, description: 'Idealny na kawkę przy ulubionej grze' },
    { id: 3, name: 'Plakat Wiedźmin 3 - Dziki Gon', price: 40, image: plakat, description: 'Panorama Novigrad' },
  ];

  const addToCart = (product) => {
    const existingProductIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingProductIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingProductIndex] = {
        ...updatedCart[existingProductIndex],
        quantity: (updatedCart[existingProductIndex].quantity || 1) + 1
      };
      setCart(updatedCart);
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    const existingProductIndex = cart.findIndex(item => item.id === productId);
    
    if (existingProductIndex > -1 && cart[existingProductIndex].quantity > 1) {
      const updatedCart = [...cart];
      updatedCart[existingProductIndex] = {
        ...updatedCart[existingProductIndex],
        quantity: updatedCart[existingProductIndex].quantity - 1
      };
      setCart(updatedCart);
    } else {
      const updatedCart = cart.filter(item => item.id !== productId);
      setCart(updatedCart);
    }
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * (item.quantity || 1), 0);
  };

  const handleCheckout = () => {
    setShowCheckout(true);
  };  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [offlinePaymentDetails, setOfflinePaymentDetails] = useState(null);

  const handleStripeCheckout = async () => {
    try {
      setIsProcessing(true);
      setPaymentError(null);
      
      const getImagePlaceholder = (name) => {
        return `https://via.placeholder.com/300x200?text=${encodeURIComponent(name)}`;
      };
        const lineItems = cart.map(item => {
        return {
          price_data: {
            currency: 'pln',
            product_data: {
              name: item.name,
              description: item.description,
        
              images: [getImagePlaceholder(item.name)]
            },
            unit_amount: item.price * 100,
          },
          quantity: item.quantity,
        };
      });
      
      if (paymentMethod === 'offline') {
        const response = await fetch('http://localhost:5000/api/create-offline-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lineItems,
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Network response was not ok');
        }

        const data = await response.json();
        setOfflinePaymentDetails(data);
        setOrderComplete(true);
        setCart([]);
        
      } else {
        const response = await fetch('http://localhost:5000/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lineItems,
            successUrl: window.location.origin + '/sklep?success=true',
            cancelUrl: window.location.origin + '/sklep?canceled=true',
          }),
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Network response was not ok');
        }

        const session = await response.json();
        window.location.href = session.url;
      }
      
    } catch (error) {
      console.error('Error during checkout:', error);
      setPaymentError('Wystąpił błąd podczas płatności. Spróbuj ponownie.');
      setIsProcessing(false);
    }
  };  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const success = queryParams.get('success');
    const canceled = queryParams.get('canceled');
    
    console.log("URL params checked:", { 
      success, 
      canceled, 
      pathname: location.pathname,
      search: location.search,
      fullUrl: window.location.href
    });
    
    if (success === 'true') {
      setPaymentError("Płatność zakończona pomyślnie.");
      setOrderComplete(true);
      setCart([]);
      navigate('/sklep', { replace: true });
    } else if (canceled === 'true') {
      setPaymentError('Płatność została anulowana.');
      setShowCheckout(false);
      navigate('/sklep', { replace: true });
    }
  }, [location, navigate]);
  if (orderComplete) {
    return (
      <div className="shop-container">
        <div className="order-complete">
          <h2>Zamówienie zakończone</h2>
          
          {offlinePaymentDetails ? (
            <>
              <p>Dziękujemy za zakupy! Aby dokończyć zamówienie, wykonaj przelew na poniższe dane:</p>
              
              <div className="bank-details">
                <h3>Dane do przelewu:</h3>
                <p><strong>Numer konta:</strong> {offlinePaymentDetails.bank_details.account_number}</p>
                <p><strong>Bank:</strong> {offlinePaymentDetails.bank_details.bank_name}</p>
                <p><strong>Odbiorca:</strong> {offlinePaymentDetails.bank_details.recipient}</p>
                <p><strong>Kwota:</strong> {offlinePaymentDetails.amount} zł</p>
                <p><strong>Tytuł przelewu:</strong> {offlinePaymentDetails.bank_details.transfer_title}</p>
              </div>
              
              <p className="important-note">
                <strong>Ważne:</strong> Zapamiętaj lub zapisz tytuł przelewu. 
                Jest on potrzebny do identyfikacji Twojej płatności.
              </p>
              
              <p>Zamówienie zostanie zrealizowane po zaksięgowaniu wpłaty i potwierdzeniu przez administratora.</p>
              <p>Status zamówienia możesz sprawdzić w historii transakcji.</p>
            </>
          ) : (
            <>
              <p>Dziękujemy za zakupy w naszym sklepie!</p>
              <p>Twoje zamówienie zostało przyjęte do realizacji.</p>
              <p>Wkrótce otrzymasz e-mail z potwierdzeniem.</p>
            </>
          )}
          
          <div className="order-complete-buttons">
            <button onClick={() => {
              setOrderComplete(false);
              setShowCheckout(false);
              setOfflinePaymentDetails(null);
            }}>
              Wróć do sklepu
            </button>
            
            <button onClick={() => navigate('/transakcje')}>
              Zobacz historię zamówień
            </button>
          </div>
        </div>
      </div>
    );
  }return (
    <div className="shop-container">
      <h1>Sklep</h1>
      
      {paymentError && (
        <div className="payment-notification error">
          <div className="notification-content">
            <h3>Status płatności</h3>
            <p>{paymentError}</p>
            <button onClick={() => setPaymentError(null)}>Zamknij</button>
          </div>
        </div>
      )}
      
      {!showCheckout ? (
        <>
          <div className="products-grid">
            {products.map(product => (
              <div key={product.id} className="product-card">
                <img src={product.image} alt={product.name} />
                <h3>{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <p className="product-price">{product.price} zł</p>
                <button onClick={() => addToCart(product)}>Dodaj do koszyka</button>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="cart-section">
              <h2>Koszyk</h2>              <ul className="cart-items">
                {cart.map((item, index) => (
                  <li key={index} className="cart-item">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{item.price * item.quantity} zł</span>
                    <div className="cart-item-controls">
                      <button onClick={() => removeFromCart(item.id)}>−</button>
                      <span className="item-quantity">{item.quantity}</span>
                      <button onClick={() => addToCart(item)}>+</button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="cart-total">
                <span>Suma: {calculateTotal()} zł</span>
                <button onClick={handleCheckout}>Przejdź do płatności</button>
              </div>
            </div>
          )}
        </>
      ) : (        <div className="checkout-section">
          <h2>Płatność</h2>          <div className="order-summary">
            <h3>Podsumowanie zamówienia</h3>
            <ul>
              {cart.map((item, index) => (
                <li key={index}>
                  {item.name} × {item.quantity} - {item.price * item.quantity} zł
                </li>
              ))}
            </ul>
            <div className="total">Razem: {calculateTotal()} zł</div>
          </div>

          <div className="payment-method-selection">
            <h3>Wybierz metodę płatności</h3>
            <div className="payment-methods">
              <div 
                className={`payment-method ${paymentMethod === 'stripe' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('stripe')}
              >
                <div className="payment-method-radio">
                  <input 
                    type="radio" 
                    id="stripe" 
                    name="paymentMethod" 
                    checked={paymentMethod === 'stripe'} 
                    onChange={() => setPaymentMethod('stripe')}
                  />
                  <label htmlFor="stripe">Karta płatnicza (Stripe)</label>
                </div>
                <p className="payment-method-desc">Płatność online z wykorzystaniem karty płatniczej</p>
              </div>
              
              <div 
                className={`payment-method ${paymentMethod === 'offline' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('offline')}
              >
                <div className="payment-method-radio">
                  <input 
                    type="radio" 
                    id="offline" 
                    name="paymentMethod" 
                    checked={paymentMethod === 'offline'} 
                    onChange={() => setPaymentMethod('offline')}
                  />
                  <label htmlFor="offline">Przelew bankowy</label>
                </div>
                <p className="payment-method-desc">Otrzymasz dane do przelewu. Zamówienie zostanie zrealizowane po zaksięgowaniu wpłaty.</p>
              </div>
            </div>
          </div>

          <div className="stripe-checkout">
            {paymentError && <div className="error-message">{paymentError}</div>}
            <p className="checkout-info">
              {paymentMethod === 'stripe' 
                ? 'Kliknij przycisk poniżej, aby przejść do bezpiecznej płatności Stripe.' 
                : 'Kliknij przycisk poniżej, aby otrzymać dane do przelewu bankowego.'}
            </p>
            <div className="form-buttons">
              <button 
                type="button" 
                onClick={() => setShowCheckout(false)}
                disabled={isProcessing}
              >
                Powrót
              </button>
              <button 
                type="button" 
                onClick={handleStripeCheckout}
                disabled={isProcessing}
                className={paymentMethod === 'stripe' ? 'stripe-button' : 'offline-button'}
              >
                {isProcessing 
                  ? 'Przetwarzanie...' 
                  : `Zapłać ${calculateTotal()} zł ${paymentMethod === 'offline' ? 'przelewem' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;
