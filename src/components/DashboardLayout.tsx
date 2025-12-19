import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Smartphone,
  AlertCircle,
  Send,
  Users,
  BarChart3,
  ShoppingCart,
  DollarSign,
  Package,
  LogOut
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Ana Sayfa' },
    { path: '/devices', icon: Smartphone, label: 'Cihazlar' },
    { path: '/device-stock', icon: Package, label: 'Cihaz Stok' },
    { path: '/defects', icon: AlertCircle, label: 'Arıza Tespiti' },
    { path: '/service', icon: Send, label: 'Teknik Servis' },
    { path: '/service-costs', icon: DollarSign, label: 'Servis Ücretleri' },
    { path: '/sales', icon: ShoppingCart, label: 'Satışa Hazır' },
    { path: '/reports', icon: BarChart3, label: 'Raporlar' },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ path: '/users', icon: Users, label: 'Kullanıcılar' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img src="/assets/logo-phone-repair_variant_3.png" alt="Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tammobil</h1>
              <p className="text-xs text-gray-500">Yenileme Merkezi</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {user?.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış Yap
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
};