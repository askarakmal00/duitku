'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, Wallet, Target,
  PieChart, BarChart2, Settings, HelpCircle,
  Moon, Sun, X, CreditCard
} from 'lucide-react';
import { getSettings, saveSettings } from '@/lib/store';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { href: '/wallet', icon: CreditCard, label: 'Hutang' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/budget', icon: PieChart, label: 'Anggaran' },
  { href: '/analytics', icon: BarChart2, label: 'Analitik' },
  { href: '/settings', icon: Settings, label: 'Pengaturan' },
];

const bottomNavItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowLeftRight, label: 'Transaksi' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/budget', icon: PieChart, label: 'Anggaran' },
  { href: '/analytics', icon: BarChart2, label: 'Analitik' },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setDarkMode(s.darkMode);
    if (s.darkMode) document.documentElement.classList.add('dark');
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    const s = getSettings();
    saveSettings({ ...s, darkMode: next });
    if (next) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">F</div>
          <span className="logo-text">FinKu</span>
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
      </nav>
    </>
  );
}
