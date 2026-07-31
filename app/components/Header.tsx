'use client';
import { useEffect, useState } from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { getSettings } from '@/lib/store';
import { getMonthName, getCurrentMonth } from '@/lib/helpers';
import { useMobileMenu } from '@/components/SupabaseProvider';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [userName, setUserName] = useState('Pengguna');
  const { year, month } = getCurrentMonth();
  const { openSidebar } = useMobileMenu();

  useEffect(() => {
    const s = getSettings();
    setUserName(s.userName);
  }, []);

  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="page-header">
      <div className="header-left">
        {/* Hamburger — mobile only */}
        <button
          className="header-btn hamburger-btn"
          onClick={openSidebar}
          aria-label="Buka menu navigasi"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1>{title}</h1>
          <p>{subtitle || `Selamat datang, ${userName} · ${getMonthName(year, month)}`}</p>
        </div>
      </div>
      <div className="header-right">
        <button className="header-btn" title="Cari">
          <Search size={18} />
        </button>
        <button className="header-btn notif-btn" title="Notifikasi">
          <Bell size={18} />
        </button>
        <div className="avatar" title={userName}>{initials}</div>
      </div>
    </header>
  );
}
