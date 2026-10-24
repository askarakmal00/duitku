'use client';
import React from 'react';
import { Users } from 'lucide-react';

export default function SpaceSwitcher() {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        background: 'rgba(16, 185, 129, 0.1)',
        color: '#059669',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        fontWeight: 600,
        fontSize: 12.5,
      }}
      title="Aplikasi Keuangan Keluarga DuitKu"
    >
      <Users size={14} />
      <span>Duitku Keluarga</span>
    </div>
  );
}
