import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FiLogOut, FiHome, FiFileText, FiUsers, FiSettings, FiUserCheck } from 'react-icons/fi';

function Layout() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const hasFullAccess = user?.role === 'admin' || user?.role === 'manager';

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: FiHome, fullAccessOnly: true },
    { name: 'Zakázky', path: '/orders', icon: FiFileText },
    { name: 'Zákazníci', path: '/customers', icon: FiUsers },
    { name: 'Uživatelé', path: '/admin/users', icon: FiUserCheck, fullAccessOnly: true },
    { name: 'Číselníky', path: '/admin/dictionaries', icon: FiSettings, fullAccessOnly: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img
                src="/cernystrnadlogo.png"
                alt="Černý Strnad"
                className="h-10"
              />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">{user?.fullName}</span>
              <button
                onClick={logout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <FiLogOut className="w-4 h-4" />
                <span className="text-sm">Odhlásit</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            {navigation
              .filter((item) => !item.fullAccessOnly || hasFullAccess)
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
          </nav>
        </aside>

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <nav className="md:hidden mb-4 flex gap-2 overflow-x-auto pb-1">
            {navigation
              .filter((item) => !item.fullAccessOnly || hasFullAccess)
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
          </nav>

          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
