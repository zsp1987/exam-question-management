import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getStoredToken, setStoredToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    async function initAuth() {
      try {
        const usersRes = await api.getDemoUsers();
        setDemoUsers(usersRes.users || []);

        const token = getStoredToken();
        if (token) {
          try {
            const meRes = await api.getMe();
            setUser(meRes.user);
          } catch (e) {
            console.warn('Stored token invalid, auto-logging in as demo admin');
            await autoDemoLogin(usersRes.users);
          }
        } else {
          await autoDemoLogin(usersRes.users);
        }
      } catch (err) {
        console.error('Failed to init auth:', err);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  async function autoDemoLogin(usersList) {
    if (usersList && usersList.length > 0) {
      // Default to Teacher (or Admin)
      const defaultUser = usersList.find(u => u.role === 'TEACHER') || usersList[0];
      try {
        const res = await api.switchUser(defaultUser.id);
        setStoredToken(res.token);
        setUser(res.user);
      } catch (err) {
        console.error('Auto login failed:', err);
      }
    }
  }

  const login = async (username, password) => {
    const res = await api.login(username, password);
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const switchUser = async (userId) => {
    const res = await api.switchUser(userId);
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const updateProfile = async (data) => {
    const res = await api.updateProfile(data);
    if (res.token) setStoredToken(res.token);
    if (res.user) setUser(res.user);
    return res;
  };

  const uploadAvatar = async (file) => {
    const form = new FormData();
    form.append('avatar', file);
    const res = await api.uploadAvatar(form);
    if (res.token) setStoredToken(res.token);
    if (res.user) setUser(res.user);
    return res;
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isReviewer = user?.role === 'REVIEWER' || isAdmin;
  const isTeacher = user?.role === 'TEACHER' || isReviewer || isAdmin;

  const value = {
    user,
    demoUsers,
    loading,
    login,
    switchUser,
    updateProfile,
    uploadAvatar,
    logout,
    isAdmin,
    isReviewer,
    isTeacher,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
