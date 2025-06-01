import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
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

    const checkAuth = async () => {
      try {
        // First check if we have a session cookie
        const sessionCookie = getCookie('session_data');
        if (!sessionCookie) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // If we have a cookie, verify it with the backend
        const response = await fetch('http://localhost:5000/api/user', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Invalid session
          setIsAuthenticated(false);
          // Clear invalid cookie
          document.cookie = 'session_data=; Max-Age=-99999999;';
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Weryfikacja logowania...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search;
    return <Navigate to="/login" replace state={{ from: currentPath }} />;
  }

  return children;
};

export default ProtectedRoute;