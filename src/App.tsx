import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './data/store'
import Layout, { useTheme } from './components/Layout'
import { Toasts } from './components/ui'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Listings from './pages/Listings'
import Tenants from './pages/Tenants'
import Inbox from './pages/Inbox'
import Viewings from './pages/Viewings'
import Payments from './pages/Payments'
import SettingsPage from './pages/Settings'
import SearchPage from './pages/Search'

function Routed() {
  const { me } = useStore()
  useTheme() // apply saved theme on every screen, including sign-in
  if (!me) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="listings" element={<Listings />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="viewings" element={<Viewings />} />
        <Route path="payments" element={<Payments />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routed />
        <Toasts />
      </BrowserRouter>
    </StoreProvider>
  )
}
