import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Login.css";

const Login = ({ onLogin }) => {
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  // Get the page the user was trying to access, or default to home
  const from = location.state?.from || "/";

  // After successful login, redirect to the originally requested page
  const handleSuccessfulLogin = (username, authMethod) => {
    onLogin(username, authMethod);
    navigate(from);
  };

  useEffect(() => {
    // Check URL for tokens from OAuth login
    const query = new URLSearchParams(window.location.search);
    const token = query.get('token');
    const username = query.get('username');
    const authMethod = query.get('auth_method');
    const register = query.get('register');
    
    // Function to get cookie by name
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts && parts.length === 2) {
        const part = parts.pop();
        if (part) {
          const result = part.split(';').shift();
          return result || null;
        }
      }
      return null;
    };
    
    // Check for session data cookie
    const sessionDataCookie = getCookie('session_data');
    if (sessionDataCookie) {
      try {
        // Parse the session data JWT
        const tokenParts = sessionDataCookie.split('.');
        if (tokenParts.length === 3) {
          const payload = tokenParts[1];
          // Fix padding for base64 decoding
          const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
          const sessionData = JSON.parse(atob(padded));
          
          console.log("Rozpoznano sesję z cookie:", sessionData);
          
          // Call parent component login handler with data from cookie
          if (sessionData && sessionData.user) {
            handleSuccessfulLogin(sessionData.user.username, sessionData.user.auth_method);
          }
          
          return; // Exit early
        }
      } catch (e) {
        console.error("Error parsing session cookie:", e);
      }
    }
    
    // If no cookie, check URL params and set cookie from them
    if (token && username) {
      console.log("Rozpoznano sesję z URL params:", { token, username, authMethod });
      
      // Create a session data object
      const sessionData = {
        token: token,
        user: {
          username: username,
          auth_method: authMethod || 'local'
        }
      };
      
      // Call parent component login handler
      handleSuccessfulLogin(username, authMethod);
    }
    
    // If register parameter is present, switch to registration mode
    if (register === 'true') {
      setIsRegistering(true);
    }
  }, [navigate, onLogin, from, handleSuccessfulLogin]);

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData({
      ...loginData,
      [name]: value,
    });
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData({
      ...registerData,
      [name]: value,
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Get user info from response
      const { username, auth_method } = data.user;
      
      setSuccessMessage("Zalogowano pomyślnie!");
      
      // On success, call the new function instead of directly calling onLogin
      handleSuccessfulLogin(username, auth_method);
      
    } catch (error) {
      setError(error.message || "Nieprawidłowe dane logowania");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate passwords match
    if (registerData.password !== registerData.confirmPassword) {
      setError("Hasła nie są identyczne");
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: registerData.username,
          email: registerData.email,
          password: registerData.password
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Błąd rejestracji');
      }
      
      // Get username from response
      const { username } = data.user;
      
      setSuccessMessage("Rejestracja pomyślna! Zalogowano automatycznie.");
      
      // Call parent component login handler
      handleSuccessfulLogin(username, 'local');
      
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message || "Nie udało się zarejestrować");
    }
  };

  const handleOAuthLogin = (provider) => {
    window.location.href = `http://localhost:5000/api/login/${provider}`;
  };

  return (
    <div className="login-page">
      <h1>{isRegistering ? 'Rejestracja' : 'Logowanie'}</h1>

      {successMessage && <p className="success-message">{successMessage}</p>}
      {error && <p className="error-message">{error}</p>}
      
      <div className="auth-tabs">
        <button 
          className={`auth-tab ${!isRegistering ? 'active' : ''}`}
          onClick={() => setIsRegistering(false)}
        >
          Logowanie
        </button>
        <button 
          className={`auth-tab ${isRegistering ? 'active' : ''}`}
          onClick={() => setIsRegistering(true)}
        >
          Rejestracja
        </button>
      </div>

      {isRegistering ? (
        <form className="login-form" onSubmit={handleRegisterSubmit}>
          <div className="form-group">
            <label htmlFor="username">Nazwa użytkownika:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={registerData.username}
              onChange={handleRegisterChange}
              required
              placeholder="Wpisz nazwę użytkownika"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={registerData.email}
              onChange={handleRegisterChange}
              required
              placeholder="Wpisz adres email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Hasło:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={registerData.password}
              onChange={handleRegisterChange}
              required
              placeholder="Wpisz hasło"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Potwierdź hasło:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={registerData.confirmPassword}
              onChange={handleRegisterChange}
              required
              placeholder="Potwierdź hasło"
            />
          </div>

          <button type="submit" className="login-button">
            Zarejestruj się
          </button>
        </form>
      ) : (
        <form className="login-form" onSubmit={handleLoginSubmit}>
          <div className="form-group">
            <label htmlFor="username">Nazwa użytkownika:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={loginData.username}
              onChange={handleLoginChange}
              required
              placeholder="Wpisz nazwę użytkownika"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Hasło:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={loginData.password}
              onChange={handleLoginChange}
              required
              placeholder="Wpisz hasło"
            />
          </div>

          <button type="submit" className="login-button">
            Zaloguj się
          </button>
          
          <div className="social-login">
            <button 
              type="button" 
              className="social-button google"
              onClick={() => handleOAuthLogin('google')}
            >
              Zaloguj przez Google
            </button>
            
            <button 
              type="button" 
              className="social-button github"
              onClick={() => handleOAuthLogin('github')}
            >
              Zaloguj przez GitHub
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Login;