import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building, Users, MessagesSquare, CalendarDays, Wallet, Settings, LogOut, Menu, Search, Moon, Sun,
} from 'lucide-react'
import { useStore } from '../data/store'
import { Avatar, Logo } from './ui'

type Theme = 'system' | 'light' | 'dark'
const THEME_KEY = 'dalali-admin:theme'

export function applyTheme(t: Theme) {
  if (t === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = t
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem(THEME_KEY) as Theme) || 'system' } catch { return 'system' }
  })
  useEffect(() => {
    applyTheme(theme)
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
  }, [theme])
  return [theme, setTheme] as const
}

export default function Layout() {
  const { db, me, signOut } = useStore()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [theme, setTheme] = useTheme()
  const nav = useNavigate()
  const loc = useLocation()

  useEffect(() => setOpen(false), [loc.pathname])

  const unread = db.conversations.filter(c => c.status === 'open' && c.unread > 0).length
  const requested = db.viewings.filter(v => v.status === 'requested').length
  const attention = db.payments.filter(p => p.status === 'pending' || p.escrow === 'held').length
  const isDark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)

  const items = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/listings', label: 'Listings', icon: Building },
    { to: '/tenants', label: 'Tenants', icon: Users },
    { to: '/inbox', label: 'Inbox', icon: MessagesSquare, count: unread },
    { to: '/viewings', label: 'Viewings', icon: CalendarDays, count: requested },
    { to: '/payments', label: 'Payments & escrow', icon: Wallet, count: attention },
  ]

  return (
    <div className="shell">
      {open && <div className="overlay" style={{ zIndex: 55 }} onClick={() => setOpen(false)} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <NavLink to="/" className="brand">
          <Logo />
          <span><b>DALALI</b><small>Admin</small></span>
        </NavLink>
        <nav className="nav">
          {items.map(({ to, label, icon: Icon, end, count }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={20} strokeWidth={1.75} /> {label}
              {!!count && <span className="count">{count}</span>}
            </NavLink>
          ))}
          <div className="nav-label">Manage</div>
          <NavLink to="/settings"><Settings size={20} strokeWidth={1.75} /> Settings</NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="me">
            <Avatar name={me!.name} size="sm" kind="admin" />
            <div><b>{me!.name}</b><span>Admin</span></div>
            <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'inherit' }} onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
          </div>
          <div className="kanga" />
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <form className="search" onSubmit={e => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`) }}>
            <Search size={18} />
            <input className="input" placeholder="Search listings, tenants, payment refs…" value={q} onChange={e => setQ(e.target.value)} />
          </form>
          <span className="spacer" />
          <button className="btn btn-ghost btn-icon" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label="Toggle dark mode" title="Toggle dark mode">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
