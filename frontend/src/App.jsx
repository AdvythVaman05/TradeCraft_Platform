import { Route, Routes, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Listings from './pages/Listings.jsx'
import Transactions from './pages/Transactions.jsx'
import Account from './pages/Account.jsx'
import SellerDashboard from './pages/SellerDashboard.jsx'
import Auth from './pages/Auth.jsx'

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        
        {/* Gen 3 Product Routes */}
        <Route path="/discover" element={<Listings />} />
        <Route path="/exchanges" element={<Transactions />} />
        <Route path="/profile" element={<Account />} />
        <Route path="/workspace" element={<SellerDashboard />} />

        {/* Backward Compatibility Redirects */}
        <Route path="/listings" element={<Navigate to="/discover" replace />} />
        <Route path="/transactions" element={<Navigate to="/exchanges" replace />} />
        <Route path="/account" element={<Navigate to="/profile" replace />} />
        <Route path="/seller" element={<Navigate to="/workspace" replace />} />
      </Route>
    </Routes>
  )
}

export default App
