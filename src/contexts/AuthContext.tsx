import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  role: 'admin' | 'user';
}

interface StoredAuth {
  user: User;
  timestamp: number;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for saved auth state
    const savedAuth = localStorage.getItem('balajibook_user');
    if (savedAuth) {
      try {
        const authData: StoredAuth = JSON.parse(savedAuth);
        const currentTime = new Date().getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        // Check if session has expired (more than 24 hours)
        if (currentTime - authData.timestamp > twentyFourHours) {
          // Session expired, clear storage
          localStorage.removeItem('balajibook_user');
          setUser(null);
        } else {
          // Session valid, restore user
          setUser(authData.user);
        }
      } catch (error) {
        // Invalid data in storage, clear it
        localStorage.removeItem('balajibook_user');
        setUser(null);
      }
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    // Hardcoded credentials
    if ((username === 'balaji' && password === '9978753398') || (username === 'user' && password === '9978753398')) {
      const userData: User = {
        username,
        role: username as 'admin' | 'user'
      };
      const authData: StoredAuth = {
        user: userData,
        timestamp: new Date().getTime()
      };
      setUser(userData);
      localStorage.setItem('balajibook_user', JSON.stringify(authData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('balajibook_user');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        isAuthenticated: !!user 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
