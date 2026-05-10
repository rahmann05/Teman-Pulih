// src/context/AuthProvider.jsx
import { useState } from 'react';
import { AuthContext } from './AuthContext';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role');
    const savedAllowedRolesRaw = localStorage.getItem('allowed_roles');
    let savedAllowedRoles = ['patient'];
    try {
      if (savedAllowedRolesRaw && savedAllowedRolesRaw !== 'undefined') {
        savedAllowedRoles = JSON.parse(savedAllowedRolesRaw);
      }
    } catch (e) { console.error('Error parsing allowed_roles', e); }

    const savedUserDataRaw = localStorage.getItem('user_data');
    let savedUserData = null;
    try {
      if (savedUserDataRaw && savedUserDataRaw !== 'undefined') {
        savedUserData = JSON.parse(savedUserDataRaw);
      }
    } catch (e) { console.error('Error parsing user_data', e); }

    return savedToken ? {
      token: savedToken,
      role: savedRole || 'patient',
      allowed_roles: savedAllowedRoles,
      ...savedUserData
    } : null;
  });
  const [loading] = useState(false);

  const login = (token, role, allowedRoles, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('allowed_roles', JSON.stringify(allowedRoles));
    localStorage.setItem('user_data', JSON.stringify(userData));
    setUser({ token, role, allowed_roles: allowedRoles, ...userData });
  };

  const switchRole = (newRole) => {
    if (user?.allowed_roles?.includes(newRole)) {
      localStorage.setItem('role', newRole);
      setUser((prev) => ({ ...prev, role: newRole }));
      window.location.reload(); // Reload to refresh data based on new role
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('allowed_roles');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
