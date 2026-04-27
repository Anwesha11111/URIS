import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { useAuthStore } from './store/authStore'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Availability from './pages/Availability'
import Tasks from './pages/Tasks'
import Review from './pages/Review'
import Team from './pages/Team'
import Alerts from './pages/Alerts'
import AdminOverview from './pages/AdminOverview'

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { token, isAdmin } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin()) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/availability" element={<PrivateRoute><Availability /></PrivateRoute>} />
        <Route path="/tasks" element={<PrivateRoute><Tasks /></PrivateRoute>} />
        <Route path="/review" element={<PrivateRoute adminOnly><Review /></PrivateRoute>} />
        <Route path="/team" element={<PrivateRoute adminOnly><Team /></PrivateRoute>} />
        <Route path="/alerts" element={<PrivateRoute adminOnly><Alerts /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute adminOnly><AdminOverview /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
