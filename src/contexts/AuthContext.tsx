import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, User } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string, role: 'operator' | 'technician' | 'admin') => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Verify user still exists in database
        const dbUser = await db.getUserByEmail(parsedUser.email);
        if (dbUser && dbUser.is_approved) {
          setUser(dbUser);
        } else {
          localStorage.removeItem('currentUser');
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const foundUser = await db.getUserByEmail(email);
    if (!foundUser) {
      throw new Error('Kullanıcı bulunamadı');
    }
    if (!foundUser.is_approved) {
      throw new Error('Hesabınız henüz onaylanmamış. Lütfen yönetici onayını bekleyin.');
    }
    setUser(foundUser);
    localStorage.setItem('currentUser', JSON.stringify(foundUser));
  };

  const signup = async (email: string, password: string, fullName: string, role: 'operator' | 'technician' | 'admin') => {
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      throw new Error('Bu email adresi zaten kullanılıyor');
    }

    const newUser: Omit<User, 'id' | 'created_at'> = {
      email,
      full_name: fullName,
      role,
      is_approved: false // New users need approval
    };

    await db.addUser(newUser);
    throw new Error('Kayıt başarılı! Hesabınız yönetici tarafından onaylandıktan sonra giriş yapabilirsiniz.');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};