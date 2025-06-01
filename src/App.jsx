import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./Navbar";
import HomePage from "./HomePage";
import Login from "./Login";
import ArticlePage from "./ArticlePage";
import Shop from "./Shop";
import AdminPanel from "./AdminPanel";
import TransactionHistory from "./TransactionHistory";
import "./App.css";


function App() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [authMethod, setAuthMethod] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
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

        const sessionCookie = getCookie('session_data');
        if (!sessionCookie) {
          setAuthChecked(true);
          return;
        }

        const response = await fetch('http://localhost:5000/api/user', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setIsLoggedIn(true);
          setUsername(data.user.username);
          setAuthMethod(data.user.auth_method);
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  if (!authChecked) {
    return <div className="loading">Ładowanie...</div>;
  }

  // Handle login success
  const handleLogin = (username, authMethod) => {
    setIsLoggedIn(true);
    setUsername(username);
    setAuthMethod(authMethod || 'local');
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setAuthMethod("");
    // Clear cookies - this is typically handled by the Navbar component
    // but we also clear the state here
  };

  // Handle tag filtering
  const handleFilterTags = (tags) => {
    setSelectedTags(tags);
  };

  // Create a protected route component
  const ProtectedRoute = ({ children }) => {
    // If authentication check is in progress, show loading
    if (isLoggedIn === null) {
      return <div className="loading">Checking authentication...</div>;
    }
    
    // If not logged in, redirect to login
    if (!isLoggedIn) {
      return <Navigate to="/login" replace />;
    }
    
    // If logged in, render the children
    return children;
  };

  return (
    <Router>
      <div className="app">
        {(isLoggedIn) && (<Navbar
          isLoggedIn={isLoggedIn}
          username={username}
          authMethod={authMethod}
          onLogout={handleLogout}
          onFilterTags={handleFilterTags}
        />)}
        
        <Routes>
          <Route
            path="/login"
            element={
              isLoggedIn ? <Navigate to="/" /> : <Login onLogin={handleLogin} />
            }
          />
          
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage selectedTags={selectedTags} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/article/silent-hill-2"
            element={
              <ProtectedRoute>
                <ArticlePage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/o-nas"
            element={
              <ProtectedRoute>
                <div className="page-content">
                  <h1>O nas</h1>
                  <p>Informacje o naszej firmie...</p>
                </div>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/kontakt"
            element={
              <ProtectedRoute>
                <div className="page-content">
                  <h1>Kontakt</h1>
                  <p>Skontaktuj się z nami...</p>
                </div>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/sklep"
            element={
              <ProtectedRoute>
                <Shop />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/transakcje"
            element={
              <ProtectedRoute>
                <TransactionHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;