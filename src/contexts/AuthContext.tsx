
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  username: string | null;
  password: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => void;
  logout: () => void;
  getAuthHeader: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  useEffect(() => {
    const savedUsername = localStorage.getItem('username');
    const savedPassword = localStorage.getItem('password');
    if (savedUsername && savedPassword) {
      setUsername(savedUsername);
      setPassword(savedPassword);
    }
  }, []);

  const login = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    localStorage.setItem('username', user);
    localStorage.setItem('password', pass);
  };

  const logout = () => {
    setUsername(null);
    setPassword(null);
    localStorage.removeItem('username');
    localStorage.removeItem('password');
  };

  const getAuthHeader = () => {
    if (username && password) {
      return 'Basic ' + btoa(username + ':' + password);
    }
    return '';
  };

  return (
    <AuthContext.Provider value={{
      username,
      password,
      isAuthenticated: !!username && !!password,
      login,
      logout,
      getAuthHeader
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
