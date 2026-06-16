import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sun, Moon, Zap, LogIn, LogOut, Settings, AlertTriangle, BarChart2, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { dark, toggle } = useTheme()
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
    setMenuOpen(false)
  }

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: <BarChart2 size={16} /> },
    { to: '/violations', label: 'Vi phạm', icon: <AlertTriangle size={16} /> },
  ]
  const adminLinks = user
    ? [
        { to: '/admin/data-entry', label: 'Nhập liệu', icon: <Settings size={16} /> },
        { to: '/admin/baseline', label: 'Baseline', icon: <Settings size={16} /> },
        { to: '/admin/slideshow', label: 'Slideshow', icon: <Settings size={16} /> },
        { to: '/admin/violation/create', label: 'Tạo vi phạm', icon: <AlertTriangle size={16} /> },
      ]
    : []

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <img src="/logo.png" alt="Tinh Lợi" className="h-9 w-auto object-contain" />
            <div className="hidden sm:block">
              <div className="gradient-text font-bold leading-tight text-sm">TINH LỢI</div>
              <div className="text-gray-500 dark:text-gray-400 text-xs font-medium leading-tight">Tiết Kiệm Năng Lượng</div>
            </div>
            <span className="gradient-text sm:hidden text-sm font-bold">TKNL</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive(l.to)
                    ? 'gradient-bg text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {l.icon}{l.label}
              </Link>
            ))}
            {user && (
              <>
                <span className="mx-1 text-gray-300 dark:text-gray-600">|</span>
                {adminLinks.map(l => (
                  <Link key={l.to} to={l.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${isActive(l.to)
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}>
                    {l.label}
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button onClick={toggle}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={dark ? 'Chế độ sáng' : 'Chế độ tối'}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <button onClick={handleSignOut}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <LogOut size={16} /> Đăng xuất
              </button>
            ) : (
              <Link to="/login"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <LogIn size={16} /> Admin
              </Link>
            )}

            {/* Mobile menu button */}
            <button onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
                  ${isActive(l.to) ? 'gradient-bg text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {l.icon}{l.label}
              </Link>
            ))}
            {user && (
              <>
                <div className="pt-2 pb-1 px-3 text-xs font-semibold text-amber-500 uppercase tracking-wider">Admin</div>
                {adminLinks.map(l => (
                  <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium
                      ${isActive(l.to) ? 'bg-amber-500 text-white' : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}>
                    {l.label}
                  </Link>
                ))}
                <button onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left">
                  <LogOut size={16} /> Đăng xuất
                </button>
              </>
            )}
            {!user && (
              <Link to="/login" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                <LogIn size={16} /> Đăng nhập Admin
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
