import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import logoimage from "./logo.JPG";

const Navbar = ({ onFilterTags, isLoggedIn, username, authMethod, onLogout }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isLoggedIn) {
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
            setIsAdmin(data.user?.is_admin || false);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      }
    };

    checkAdminStatus();
  }, [isLoggedIn]);

  const tags = ["Gry", "Horror", "Porady", "Gracze", "Artykuł", "Dyskusje"];

  const handleTagChange = (tag) => {
    setSelectedTags((prevTags) =>
      prevTags.includes(tag) ? prevTags.filter((t) => t !== tag) : [...prevTags, tag]
    );
  };

  const handleApplyFilters = () => {
    if (typeof onFilterTags === "function") {
      onFilterTags(selectedTags);
    }
    setIsSearchOpen(false);
  };

  const handleLogout = async () => {
    try {
      // Call logout endpoint
      const response = await fetch('http://localhost:5000/api/logout', {
        method: 'POST',
        credentials: 'include'  // Important to include cookies
      });
      
      if (!response.ok) {
        console.error('Logout failed');
      }
      
      // Clear cookies
      document.cookie = 'session_data=; Max-Age=0; path=/;';
      
      // Call parent component logout handler
      if (typeof onLogout === 'function') {
        onLogout();
      }
      
      // Navigate is handled by the parent component
      
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <img src={logoimage} alt="Logo" />
      </div>
      <ul className="nav-links">
        <li>
          <Link to="/">Blog</Link>
        </li>
        <li>
          <Link to="/o-nas">O nas</Link>
        </li>
        <li>
          <Link to="/kontakt">Kontakt</Link>
        </li>
        <li>
          <Link to="/sklep">Sklep</Link>
        </li>
        <li className="search" onClick={() => setIsSearchOpen(!isSearchOpen)}>
          Wyszukaj
        </li>
      </ul>
      
      {isLoggedIn ? (
        <div className="user-logged-in">
          <span className="username">
            Zalogowano, {username}
            {authMethod !== 'local' && ` (${authMethod})`}
          </span>
          <div className="user-menu">
            <Link to="/transakcje" className="user-menu-link">Historia zamówień</Link>
            {isAdmin && (
              <Link to="/admin" className="user-menu-link admin-link">Panel Admina</Link>
            )}
            <button className="logout-button" onClick={handleLogout}>
              Wyloguj
            </button>
          </div>
        </div>
      ) : (
        <div className="auth-links">
          <Link to="/login" className="login-link">Logowanie</Link>
          <Link to="/login?register=true" className="register-link">Rejestracja</Link>
        </div>
      )}

      {isSearchOpen && (
        <div className="search-dropdown">
          <h3>Filtruj według tagów</h3>
          <div className="tags-list">
            {tags.map((tag, index) => (
              <label key={index} className="tag-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag)}
                  onChange={() => handleTagChange(tag)}
                />
                {tag}
              </label>
            ))}
          </div>
          <button className="apply-button" onClick={handleApplyFilters}>
            Zastosuj
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;