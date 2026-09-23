import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Listings from './pages/Listings.jsx'
import Transactions from './pages/Transactions.jsx'
import Account from './pages/Account.jsx'
import SellerDashboard from './pages/SellerDashboard.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/account" element={<Account />} />
        <Route path="/seller" element={<SellerDashboard />} />
      </Route>
    </Routes>
  )
}

export default App
