import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Violations from './pages/Violations'
import Login from './pages/Login'
import DataEntry from './pages/admin/DataEntry'
import BaselineSettings from './pages/admin/BaselineSettings'
import SlideshowManager from './pages/admin/SlideshowManager'
import ViolationCreate from './pages/admin/ViolationCreate'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 gradient-bg rounded-full animate-spin" style={{ borderTopColor: 'transparent' }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/violations" element={<Violations />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/data-entry" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />
          <Route path="/admin/baseline" element={<ProtectedRoute><BaselineSettings /></ProtectedRoute>} />
          <Route path="/admin/slideshow" element={<ProtectedRoute><SlideshowManager /></ProtectedRoute>} />
          <Route path="/admin/violation/create" element={<ProtectedRoute><ViolationCreate /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="py-4 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-200 dark:border-gray-800">
        © 2026 Tinh Lợi · Hệ thống theo dõi tiết kiệm năng lượng
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
