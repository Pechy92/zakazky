import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Customers from './pages/Customers';
import Offers from './pages/Offers';
import AdminDictionaries from './pages/AdminDictionaries';
import CustomerDetail from './pages/CustomerDetail';
import OfferDetail from './pages/OfferDetail';
import AdminUsers from './pages/AdminUsers';

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);

  const hasFullAccess = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to={hasFullAccess ? '/dashboard' : '/orders'} replace />} />
          <Route path="dashboard" element={hasFullAccess ? <Dashboard /> : <Navigate to="/orders" replace />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="offers" element={hasFullAccess ? <Offers /> : <Navigate to="/orders" replace />} />
          <Route path="offers/:id" element={hasFullAccess ? <OfferDetail /> : <Navigate to="/orders" replace />} />
          <Route path="admin/dictionaries" element={hasFullAccess ? <AdminDictionaries /> : <Navigate to="/orders" replace />} />
          <Route path="admin/users" element={hasFullAccess ? <AdminUsers /> : <Navigate to="/orders" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
