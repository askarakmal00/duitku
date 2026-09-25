'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, Target,
  PieChart, BarChart2, Settings, HelpCircle,
  Moon, Sun, X, CreditCard, CalendarDays, LayoutGrid
} from 'lucide-react';
import { getSettings, saveSettings } from '@/lib/store';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { href: '/budget', icon: PieChart, label: 'Anggaran' },
  { href: '/wallet', icon: CreditCard, label: 'Hutang' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/calendar', icon: CalendarDays, label: 'Kalender' },
  { href: '/analytics', icon: BarChart2, label: 'Analitik' },
  { href: '/settings', icon: Settings, label: 'Pengaturan' },
];

const bottomNavItems = [
  { href: '/', icon: LayoutDashboard, label: 'Home' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { href: '/budget', icon: PieChart, label: 'Anggaran' },
  { href: '/wallet', icon: CreditCard, label: 'Hutang' },
  { href: '/goals', icon: Target, label: 'Goals' },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setDarkMode(s.darkMode);
    if (s.darkMode) document.documentElement.classList.add('dark');
  }, []);

  // Close sheet on route change
  useEffect(() => {
    setShowMoreSheet(false);
  }, [pathname]);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    const s = getSettings();
    saveSettings({ ...s, darkMode: next });
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const isMoreActive = pathname === '/calendar' || pathname === '/analytics' || pathname === '/settings';

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">D</div>
          <span className="logo-text">Duitku</span>
          {/* Close button on mobile */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-label">Menu Utama</span>
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${pathname === href ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="dark-toggle-btn" onClick={toggleDark}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <Link href="/settings" className="nav-item" onClick={onClose}>
            <HelpCircle size={18} />
            Bantuan
          </Link>
        </div>
      </aside>

      {/* Bottom Navigation (mobile only) */}
      <nav className="bottom-nav">
        {bottomNavItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`bottom-nav-item ${pathname === href ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}

        <button
          className={`bottom-nav-item ${isMoreActive ? 'active' : ''}`}
          onClick={() => setShowMoreSheet(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Semua menu"
        >
          <LayoutGrid size={20} />
          <span>Lainnya</span>
        </button>
      </nav>

      {/* Bottom Sheet Menu Lainnya (Mobile) */}
      {showMoreSheet && (
        <>
          <div
            className="sidebar-overlay"
            style={{ display: 'block', zIndex: 998 }}
            onClick={() => setShowMoreSheet(false)}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--card)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              boxShadow: '0 -10px 40px rgba(0,0,0,0.25)',
              zIndex: 999,
              padding: '20px 18px 36px',
              animation: 'slideUp 0.2s ease',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Semua Menu & Fitur</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Akses cepat ke seluruh modul Duitku</div>
              </div>
              <button
                onClick={() => setShowMoreSheet(false)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {navItems.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMoreSheet(false)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '12px 6px',
                      background: isActive ? 'var(--primary-50)' : 'var(--bg-secondary)',
                      borderRadius: 14,
                      border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--border-light)',
                      textDecoration: 'none',
                      color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: isActive ? 'var(--primary)' : 'var(--card)',
                      color: isActive ? '#FFFFFF' : 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow-sm)',
                    }}>
                      <Icon size={20} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Quick action footer inside sheet */}
            <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 14, display: 'flex', gap: 10 }}>
              <button
                onClick={() => { toggleDark(); setShowMoreSheet(false); }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px',
                  borderRadius: 12,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                {darkMode ? 'Mode Terang' : 'Mode Gelap'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
