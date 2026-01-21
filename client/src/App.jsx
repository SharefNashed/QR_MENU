import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Menu from './pages/Menu';
import ShopLogin from './pages/ShopLogin';
import Dashboard from './pages/Dashboard';
import SuperAdmin from './pages/SuperAdmin';
import SuperAdminLogin from './pages/SuperAdminLogin';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Home - redirect to super admin or show landing */}
        <Route path="/" element={<Navigate to="/super-admin" replace />} />

        {/* Super Admin */}
        <Route path="/super-admin" element={<SuperAdminLogin />} />
        <Route path="/super-admin/dashboard" element={<SuperAdmin />} />

        {/* Shop Routes */}
        <Route path="/:shopSlug" element={<Menu />} />
        <Route path="/:shopSlug/admin" element={<ShopLogin />} />
        <Route path="/:shopSlug/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
