// src/context/AuthProvider.jsx
import { useState } from 'react';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role');
    const savedUserDataRaw = localStorage.getItem('user_data');
    const savedAllowedRolesRaw = localStorage.getItem('allowed_roles');
    let savedAllowedRoles = ['patient'];
    let savedUserData = null;

    if (savedUserDataRaw) {
      try {
        savedUserData = JSON.parse(savedUserDataRaw);
      } catch (e) {
        console.error('Error parsing user_data from localStorage:', e);
      }
    }

    if (savedAllowedRolesRaw) {
      try {
        savedAllowedRoles = JSON.parse(savedAllowedRolesRaw);
      } catch (e) {
        console.error('Error parsing allowed_roles from localStorage:', e);
      }
    }

    if (savedToken && savedRole) {
      return { token: savedToken, role: savedRole, allowedRoles: savedAllowedRoles, ...savedUserData };
    }
    return null;
  });

  const login = (token, role, allowedRoles, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('allowed_roles', JSON.stringify(allowedRoles));
    if (userData) {
      localStorage.setItem('user_data', JSON.stringify(userData));
    }
    setUser({ token, role, allowedRoles, ...userData });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('allowed_roles');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  const updateAllowedRoles = (newRoles) => {
    localStorage.setItem('allowed_roles', JSON.stringify(newRoles));
    setUser((prev) => prev ? { ...prev, allowedRoles: newRoles } : null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateAllowedRoles }}>
      {children}
    </AuthContext.Provider>
  );
};
